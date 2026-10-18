import { createFileRoute } from "@tanstack/react-router";
import { ChatWorkspace } from "@/components/chat-workspace";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatRoute,
});

function ChatRoute() {
  const { threadId } = Route.useParams();

  return <ChatWorkspace threadId={threadId} />;
}