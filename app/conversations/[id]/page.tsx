import { notFound } from "next/navigation";

import { ChatView } from "@/components/chat/chat-view";
import { getConversationBundle } from "@/lib/data/conversations";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getConversationBundle(id);
  if (!bundle) notFound();

  const { conversation, scenario, messages } = bundle;

  return (
    <main className="flex h-[calc(100dvh-3rem)] flex-1 flex-col md:h-[calc(100dvh-3rem)]">
      <ChatView
        conversationId={conversation.id}
        scenario={scenario}
        initialMessages={messages}
        initialAchievedGoalIds={conversation.goals_achieved}
      />
    </main>
  );
}
