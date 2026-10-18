
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";

import {
  getConversations,
  getConversation,
  deleteConversation,
  type ApiConversation,
  type ApiMessage,
} from "@/lib/api";

export type ChatThread = {
  id: string;
  title: string;
  group: string;
  messages: UIMessage[];
  createdAt?: string;
  updatedAt?: string;
  loaded: boolean;
  isDraft: boolean;
};

function getGroup(dateString?: string): string {
  if (!dateString) return "Today";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Older";

  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  if (date >= sevenDaysAgo) {
    return "Previous 7 days";
  }

  return "Older";
}

function toUIMessage(message: ApiMessage): UIMessage {
  return {
    id: message.message_id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

function toChatThread(
  conversation: ApiConversation,
): ChatThread {
  return {
    id: conversation.conversation_id,
    title: conversation.title || "New conversation",
    group: getGroup(
      conversation.updated_at ?? conversation.created_at,
    ),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    messages: [],
    loaded: false,
    isDraft: false,
  };
}

type Store = {
  threads: ChatThread[];
  loading: boolean;
  create: () => string;
  loadConversation: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  markPersisted: (id: string) => void;
  update: (
    id: string,
    fn: (thread: ChatThread) => ChatThread,
  ) => void;
  remove: (id: string) => Promise<void>;
};

const ChatContext = createContext<Store | null>(null);

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep the latest state available to stable asynchronous callbacks.
  const threadsRef = useRef<ChatThread[]>([]);
  const inFlightLoads = useRef(
    new Map<string, Promise<void>>(),
  );
  const loadedIds = useRef(new Set<string>());
  const deletedIds = useRef(new Set<string>());

  // All store updates go through this helper so asynchronous
  // callbacks can read the latest state without stale closures.
  const commitThreads = useCallback(
    (
      update:
        | ChatThread[]
        | ((current: ChatThread[]) => ChatThread[]),
    ) => {
      const next =
        typeof update === "function"
          ? update(threadsRef.current)
          : update;

      threadsRef.current = next;
      setThreads(next);
    },
    [],
  );

  const create = useCallback((): string => {
    const id = crypto.randomUUID();

    const draft: ChatThread = {
      id,
      title: "New conversation",
      group: "Today",
      messages: [],
      loaded: true,
      isDraft: true,
    };

    deletedIds.current.delete(id);
    loadedIds.current.add(id);

    commitThreads((current) => [
      draft,
      ...current.filter((thread) => thread.id !== id),
    ]);

    return id;
  }, [commitThreads]);

  const markPersisted = useCallback(
    (id: string) => {
      commitThreads((current) =>
        current.map((thread) =>
          thread.id === id
            ? { ...thread, isDraft: false }
            : thread,
        ),
      );

      // It is now a real backend conversation, but its complete
      // messages are already available in the local store.
      loadedIds.current.add(id);
    },
    [commitThreads],
  );

  const refresh = useCallback(async () => {
    const conversations = await getConversations();
    const serverThreads = conversations.map(toChatThread);
    const serverIds = new Set(
      serverThreads.map((thread) => thread.id),
    );

    commitThreads((current) => {
      const currentById = new Map(
        current.map((thread) => [thread.id, thread]),
      );

      const mergedServerThreads = serverThreads
        .filter((thread) => !deletedIds.current.has(thread.id))
        .map((serverThread) => {
          const local = currentById.get(serverThread.id);

          // Keep local messages and title when already loaded.
          if (local?.loaded) {
            return {
              ...serverThread,
              title:
                local.title !== "New conversation"
                  ? local.title
                  : serverThread.title,
              messages: local.messages,
              loaded: true,
              isDraft: false,
            };
          }

          return serverThread;
        });

      // Preserve unsaved drafts and locally known conversations
      // that are not yet visible in the server list.
      const localOnly = current.filter(
        (thread) =>
          !serverIds.has(thread.id) &&
          !deletedIds.current.has(thread.id),
      );

      return [...localOnly, ...mergedServerThreads].sort(
        (a, b) => {
          const dateA = new Date(
            a.updatedAt ?? a.createdAt ?? 0,
          ).getTime();

          const dateB = new Date(
            b.updatedAt ?? b.createdAt ?? 0,
          ).getTime();

          return dateB - dateA;
        },
      );
    });
  }, [commitThreads]);

  // One initial fetch. Reuse refresh so merging behavior is consistent.
  useEffect(() => {
    let active = true;

    void refresh()
      .catch((error) => {
        console.error("Failed to load conversations:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refresh]);

  const loadConversation = useCallback(
    async (id: string): Promise<void> => {
      const current = threadsRef.current.find(
        (thread) => thread.id === id,
      );

      // Drafts exist only in the frontend until the first
      // successful POST /chat.
      if (current?.isDraft) return;

      if (loadedIds.current.has(id)) return;

      // Avoid duplicate GET requests for the same conversation.
      const existingRequest = inFlightLoads.current.get(id);
      if (existingRequest) return existingRequest;

      const request = (async () => {
        const conversation = await getConversation(id);

        // The conversation may have been deleted while the
        // request was in flight.
        if (deletedIds.current.has(id)) return;

        const serverThread = toChatThread(conversation);

        const loadedThread: ChatThread = {
          ...serverThread,
          messages: conversation.messages.map(toUIMessage),
          loaded: true,
          isDraft: false,
        };

        commitThreads((currentThreads) => {
          const local = currentThreads.find(
            (thread) => thread.id === id,
          );

          // If the user has already started editing this thread,
          // do not overwrite a newer local state with stale data.
          if (local?.isDraft) return currentThreads;

          const merged = local
            ? {
                ...loadedThread,
                title:
                  local.title !== "New conversation"
                    ? local.title
                    : loadedThread.title,
                messages:
                  local.loaded && local.messages.length > 0
                    ? local.messages
                    : loadedThread.messages,
              }
            : loadedThread;

          const exists = currentThreads.some(
            (thread) => thread.id === id,
          );

          return exists
            ? currentThreads.map((thread) =>
                thread.id === id ? merged : thread,
              )
            : [merged, ...currentThreads];
        });

        loadedIds.current.add(id);
      })();

      inFlightLoads.current.set(id, request);

      try {
        await request;
      } finally {
        inFlightLoads.current.delete(id);
      }
    },
    [commitThreads],
  );

  const update = useCallback(
    (
      id: string,
      fn: (thread: ChatThread) => ChatThread,
    ) => {
      commitThreads((current) =>
        current.map((thread) =>
          thread.id === id ? fn(thread) : thread,
        ),
      );
    },
    [commitThreads],
  );

  const remove = useCallback(
    async (id: string) => {
      const existing = threadsRef.current.find(
        (thread) => thread.id === id,
      );

      // A draft has no server record to delete.
      if (existing && !existing.isDraft) {
        await deleteConversation(id);
      }

      deletedIds.current.add(id);
      loadedIds.current.delete(id);

      commitThreads((current) =>
        current.filter((thread) => thread.id !== id),
      );
    },
    [commitThreads],
  );

  return (
    <ChatContext.Provider
      value={{
        threads,
        loading,
        create,
        loadConversation,
        refresh,
        markPersisted,
        update,
        remove,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const value = useContext(ChatContext);

  if (!value) {
    throw new Error("ChatProvider required");
  }

  return value;
}
