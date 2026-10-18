import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { UIMessage } from "ai";

import { sendMessage } from "@/lib/api";
import { useChatStore } from "@/lib/chat-store";
import { AgentMark } from "./agent-mark";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  messagesToMarkdown,
} from "@/components/ai-elements/conversation";

import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function IconControl({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// function AttachmentTools() {
//   const attachments = usePromptInputAttachments();

//   return (
//     <div className="attachment-tools">
//       <IconControl
//         label="Attach a file"
//         onClick={attachments.openFileDialog}
//       >
//         <Paperclip />
//       </IconControl>

//       {attachments.files.map((file) => (
//         <span className="file-chip" key={file.id}>
//           <FileText size={14} />
//           <span>{file.filename}</span>
//           <Button
//             variant="ghost"
//             size="icon-xs"
//             aria-label={`Remove ${file.filename}`}
//             onClick={() => attachments.remove(file.id)}
//           >
//             <X />
//           </Button>
//         </span>
//       ))}
//     </div>
//   );
// }

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}


function createConversationTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (!cleaned) return "New conversation";

  const maxLength = 40;

  return cleaned.length > maxLength
    ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…`
    : cleaned;
}


type ResearchRecord = Record<string, unknown>;

function getString(
  record: ResearchRecord,
  key: string,
): string | undefined {
  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function formatAgentResponse(response: {
  response?: string;
  events?: Array<Record<string, unknown>>;
  search_results?: Array<Record<string, unknown>>;
}): string {
  const events = Array.isArray(response.events) ? response.events : [];
  const sources = Array.isArray(response.search_results)
    ? response.search_results
    : [];

  const eventText = events
    .map((event, index) => {
      const title =
        getString(event, "title") ?? `Event ${index + 1}`;

      const details = [
        getString(event, "organization"),
        getString(event, "event_type"),
        getString(event, "date"),
        getString(event, "location"),
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .join(" · ");

      const summary =
        getString(event, "summary") ||
        getString(event, "description") ||
        getString(event, "content") ||
        "";

      return [`### ${index + 1}. ${title}`, details, summary]
        .filter(Boolean)
        .join("\n\n");
    })
    .join("\n\n");

  const sourceText = sources
    .map((source, index) => {
      const title =
        getString(source, "title") ?? `Source ${index + 1}`;

      const url = getString(source, "url") ?? "";

      // Only render HTTP(S) URLs as Markdown links.
      if (/^https?:\/\//i.test(url)) {
        return `- [${title}](${url})`;
      }

      return `- ${title}`;
    })
    .join("\n");

  if (events.length > 0 || sourceText) {
    return [
      events.length > 0 ? "## Latest K12 developments" : "",
      eventText,
      sourceText ? `## Sources\n\n${sourceText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return response.response?.trim() || "The agent returned no response.";
}

export function ChatWorkspace({ threadId }: { threadId: string }) {
  
  const { threads, create, update, remove, loadConversation, refresh, markPersisted, loading, } = useChatStore();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<
    Record<string, "up" | "down" | null>
  >({});

  const textarea = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  const thread = threads.find((item) => item.id === threadId);
  const messages = thread?.messages ?? [];

  const { logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();

      navigate({
        to: "/login",
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
  // Load persisted messages when opening a conversation route.
  useEffect(() => {
    // Wait until the initial conversation list has loaded.
    if (loading) return;

    const currentThread = threads.find(
      (item) => item.id === threadId,
    );

    // Drafts and already-loaded conversations need no GET request.
    if (currentThread?.isDraft || currentThread?.loaded) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        await loadConversation(threadId);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load conversation:", error);
          toast.error(
            "Could not load this conversation. It may not exist.",
          );
        }
      }
    }

    void load();

    return () => {
        cancelled = true;
      };
    }, [
      threadId,
      threads,
      loading,
      loadConversation,
  ]);
  

  useEffect(() => {
    textarea.current?.focus();
  }, [threadId]);

  function newChat() {
    const id = create();
    setDraft("");
    setMobileOpen(false);

    void navigate({
      to: "/chat/$threadId",
      params: { threadId: id },
    });
  }

  async function submit(input: PromptInputMessage) {
    const text = input.text.trim();

    if (sendingRef.current) return;

    if (!text && input.files.length > 0) {
      toast.error(
        "File uploads are not connected to the backend yet. Please enter a text message.",
      );
      return;
    }

    if (!text) return;

    if (!thread) {
      toast.error("Conversation unavailable. Start a new chat.");
      return;
    }

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text }],
    };

    // Optimistically display the user's message.
    
    const title = createConversationTitle(text);

    update(threadId, (current) => {
      const isFirstUserMessage = !current.messages.some(
        (message) => message.role === "user",
      );

      return {
        ...current,
        title: isFirstUserMessage
          ? title
          : current.title,
        messages: [...current.messages, userMessage],
      };
    });

    setDraft("");
    sendingRef.current = true;
    setSending(true);

    try {
      const response = await sendMessage(threadId, text);
      markPersisted(threadId);
      
      const responseText = formatAgentResponse(response);

      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: responseText }],
      };

      update(threadId, (current) => ({
        ...current,
        messages: [...current.messages, assistantMessage],
      }));

      // Refresh the sidebar's conversation list from the backend.
      // The store should preserve already-loaded messages while merging records.
      try {
        await refresh();
      } catch (refreshError) {
        console.error(
          "Message succeeded, but conversation list refresh failed:",
          refreshError,
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      toast.error("Failed to get a response from K12 Agent.");

      // Keep the user's message visible so it can be retried or copied.
    } finally {
      sendingRef.current = false;
      setSending(false);
      textarea.current?.focus();
    }
  }

  function exportChat() {
    if (!messages.length) {
      toast.error("There are no messages to export.");
      return;
    }

    const blob = new Blob([messagesToMarkdown(messages)], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${(thread?.title || "conversation")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .trim()}.md`;

    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteConversation() {
    try {
      await remove(threadId);
      
      toast.success("Conversation deleted.");

      void navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Could not delete this conversation.");
    }
  }

  const filteredThreads = threads.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  );

  const groups = ["Today", "Yesterday", "Previous 7 days", "Older"];

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`chat-app ${collapsed ? "sidebar-collapsed" : ""} ${
          mobileOpen ? "mobile-sidebar-open" : ""
        }`}
      >
        {mobileOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside className="chat-sidebar">
          <Link to="/" className="brand">
            <AgentMark />
            <div className="sidebar-text">
              <span className="brand-name">K12 Intelligence</span>
              <span className="brand-subtitle">
                A little insight. A big difference.
              </span>
            </div>
          </Link>

          <div className="sidebar-top-actions">
            <Button className="new-chat" onClick={newChat}>
              <Plus />
              <span className="sidebar-text">New conversation</span>
            </Button>

            <div className="search-row">
              <Button
                variant="ghost"
                className="search-button"
                onClick={() => {
                  if (collapsed) setCollapsed(false);
                  setSearchOpen((value) => !value);
                }}
              >
                <Search />
                <span className="sidebar-text">Search conversations</span>
                <span className="search-key sidebar-text">⌕</span>
              </Button>

              {searchOpen && (
                <Input
                  aria-label="Search conversations"
                  placeholder="Search…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoFocus
                />
              )}
            </div>
          </div>

          <nav className="thread-list" aria-label="Conversations">
            {groups.map((group) => {
              const now = new Date();

              const groupThreads = filteredThreads.filter((item) => {
                // Use the store's group when it is available.
                // The backend should map timestamps to these groups.
                return item.group === group;
              });

              return groupThreads.length ? (
                <section className="thread-group" key={group}>
                  <h2 className="sidebar-text">{group}</h2>

                  {groupThreads.map((item) => (
                    <Link
                      key={item.id}
                      to="/chat/$threadId"
                      params={{ threadId: item.id }}
                      onClick={() => setMobileOpen(false)}
                      className={`thread-link ${
                        item.id === threadId ? "thread-active" : ""
                      }`}
                      title={item.title}
                    >
                      <MessageSquare />
                      <span className="sidebar-text">{item.title}</span>
                      {item.id === threadId && (
                        <span className="active-dot sidebar-text" />
                      )}
                    </Link>
                  ))}
                </section>
              ) : null;
            })}

            {search &&
              filteredThreads.length === 0 && (
                <p className="no-results sidebar-text">
                  No conversations found.
                </p>
              )}
          </nav>

          <div className="sidebar-bottom">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="profile">
                  <span className="profile-avatar">K</span>
                  <span className="profile-copy sidebar-text">
                    <strong>K12 Workspace</strong>
                    <span>Education intelligence</span>
                  </span>
                  <ChevronDown className="sidebar-text" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start">
                <DropdownMenuItem onClick={exportChat}>
                  <Download />
                  Export current conversation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void handleLogout()}
                  className="cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <main className="chat-main">
          <header className="chat-header">
            <div className="header-left">
              <div className="desktop-collapse">
                <IconControl
                  label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  onClick={() => setCollapsed((value) => !value)}
                >
                  {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                </IconControl>
              </div>

              <div className="mobile-collapse">
                <IconControl
                  label="Open conversations"
                  onClick={() => setMobileOpen(true)}
                >
                  <PanelLeftOpen />
                </IconControl>
              </div>

              <div className="header-title">
                <h1>
                  K12 Agent <ChevronDown size={14} />
                </h1>
                <p>Your education intelligence partner</p>
              </div>
            </div>

            <div className="header-right">
              <span className="preview-badge">
                Educational Intelligence
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Conversation options"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportChat}>
                    <Download />
                    Export conversation
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    disabled={!thread}
                    onClick={() => void handleDeleteConversation()}
                  >
                    <Trash2 />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <Conversation key={threadId} className="transcript">
            <ConversationContent className="transcript-content">
              {!messages.length && (
                <div className="empty-chat">
                  <AgentMark />
                  <h2>What’s on your mind?</h2>
                  <p>Let’s find your next insight.</p>

                  <div className="starter-prompts">
                    {[
                      "Explore funding opportunities",
                      "Find education partnerships",
                      "Research K12 trends",
                    ].map((text) => (
                      <Button
                        variant="outline"
                        key={text}
                        onClick={() => {
                          setDraft(text);
                          textarea.current?.focus();
                        }}
                      >
                        {text}
                        <ArrowUpRight />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <Message
                  key={message.id}
                  from={message.role}
                  className="chat-message"
                >
                  <div
                    className={`message-label ${
                      message.role === "user" ? "user-label" : ""
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <>
                        <AgentMark small />
                        <strong>K12 Agent</strong>
                      </>
                    ) : (
                      <>
                        <strong>You</strong>
                        <span className="user-avatar">Y</span>
                      </>
                    )}
                  </div>

                  <MessageContent className="message-body">
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <MessageResponse key={index}>
                          {part.text}
                        </MessageResponse>
                      ) : part.type === "file" ? (
                        <span className="sent-file" key={index}>
                          <FileText size={16} />
                          {part.filename || "Attachment"}
                        </span>
                      ) : null,
                    )}
                  </MessageContent>

                  {message.role === "assistant" && (
                    <MessageActions className="answer-actions">
                      <MessageAction
                        tooltip="Copy response"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(getMessageText(message))
                            .then(() => toast.success("Response copied"))
                            .catch(() =>
                              toast.error("Could not copy response."),
                            );
                        }}
                      >
                        <Copy />
                      </MessageAction>

                      <MessageAction
                        tooltip="Helpful"
                        className={
                          feedback[message.id] === "up"
                            ? "feedback-selected"
                            : ""
                        }
                        onClick={() =>
                          setFeedback((current) => ({
                            ...current,
                            [message.id]:
                              current[message.id] === "up" ? null : "up",
                          }))
                        }
                      >
                        {feedback[message.id] === "up" ? (
                          <Check />
                        ) : (
                          <ThumbsUp />
                        )}
                      </MessageAction>

                      <MessageAction
                        tooltip="Not helpful"
                        className={
                          feedback[message.id] === "down"
                            ? "feedback-selected"
                            : ""
                        }
                        onClick={() =>
                          setFeedback((current) => ({
                            ...current,
                            [message.id]:
                              current[message.id] === "down" ? null : "down",
                          }))
                        }
                      >
                        <ThumbsDown />
                      </MessageAction>

                      <span className="answer-signature">
                        K12 Intelligence
                      </span>
                    </MessageActions>
                  )}
                </Message>
              ))}

              {sending && (
                <Message from="assistant" className="chat-message">
                  <div className="message-label">
                    <AgentMark small />
                    <strong>K12 Agent</strong>
                  </div>
                  <MessageContent className="message-body">
                    <p>Researching K12 intelligence…</p>
                  </MessageContent>
                </Message>
              )}

            </ConversationContent>

            <ConversationScrollButton aria-label="Scroll to latest message" />
          </Conversation>

          <div className="composer-area">
            <div className="composer-inner">
              <PromptInput
                onSubmit={submit}
                className="chat-composer"
                multiple
                maxFiles={5}
                maxFileSize={10 * 1024 * 1024}
                onError={(error) => toast.error(error.message)}
              >
                <PromptInputTextarea
                  ref={textarea}
                  aria-label="Message K12 Agent"
                  placeholder="Ask K12 Agent anything…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />

                <PromptInputFooter>

                  <PromptInputSubmit
                    aria-label="Send message"
                    className="send-button"
                    status={sending ? "streaming" : "ready"}
                    disabled={sending || !draft.trim()}
                  >
                    <ArrowUp />
                  </PromptInputSubmit>
                </PromptInputFooter>
              </PromptInput>

              <div className="composer-note">
                <span>
                  K12 Agent can make mistakes. Verify important information.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
