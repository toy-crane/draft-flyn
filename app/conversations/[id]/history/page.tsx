import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GoalBar } from "@/components/chat/goal-bar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { getConversationBundle } from "@/lib/data/conversations";

export default async function ConversationHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getConversationBundle(id);
  if (!bundle) notFound();

  const { conversation, scenario, messages } = bundle;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <p className="text-muted-foreground text-xs">
          {scenario.summary || scenario.situation}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/scenarios/${scenario.id}`}>다시 시작하기</Link>
        </Button>
      </div>

      <GoalBar goals={scenario.goals} achieved={conversation.goals_achieved} />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4">
        {messages.map((m) => {
          const isTranslated =
            !!m.english_text && m.english_text !== m.original_text;
          return (
            <MessageBubble
              key={m.id}
              messageId={m.id}
              role={m.role}
              text={m.original_text}
              correction={m.correction ?? null}
              translation={isTranslated ? (m.english_text ?? null) : null}
            />
          );
        })}
        <p className="text-muted-foreground mt-4 text-center text-xs">
          종료된 대화 (읽기 전용)
        </p>
      </div>
    </main>
  );
}
