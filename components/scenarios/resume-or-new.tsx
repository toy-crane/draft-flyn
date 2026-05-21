"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, RefreshCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { startNewConversationForScenarioAction } from "@/app/scenarios/actions";

export function ResumeOrNew({
  scenarioId,
  scenarioSummary,
  inProgressConversationId,
}: {
  scenarioId: string;
  scenarioSummary: string;
  inProgressConversationId: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  async function startFresh() {
    setStarting(true);
    try {
      await startNewConversationForScenarioAction(scenarioId);
    } catch {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
      <header>
        <p className="text-muted-foreground text-xs">진행 중 대화가 있어요</p>
        <h1 className="mt-1 text-xl font-semibold">{scenarioSummary}</h1>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이어서 하기</CardTitle>
            <CardDescription>
              저장된 메시지와 목표 진행도가 그대로 유지돼요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/conversations/${inProgressConversationId}`)}
              className="w-full"
            >
              <ArrowRightIcon data-icon="inline-start" />
              이어서 하기
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새로 시작</CardTitle>
            <CardDescription>
              지금 진행 중인 대화는 자동으로 종료돼요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={startFresh}
              disabled={starting}
              className="w-full"
            >
              <RefreshCcwIcon data-icon="inline-start" />
              {starting ? "준비 중…" : "새로 시작"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
