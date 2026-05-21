"use client";

import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const EXAMPLE_CHIPS = [
  "카페 주문",
  "면접 연습",
  "공항 환승",
  "병원 예약",
  "마트 장보기",
];

export function EmptyState() {
  const router = useRouter();

  function startNew(prefill?: string) {
    const params = prefill ? `?prefill=${encodeURIComponent(prefill)}` : "";
    router.push(`/scenarios/new${params}`);
  }

  return (
    <Empty className="mx-auto max-w-xl">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SparklesIcon />
        </EmptyMedia>
        <EmptyTitle>첫 시나리오를 만들어보세요</EmptyTitle>
        <EmptyDescription>
          상황과 역할만 알려주면 AI가 학습 목표 3개를 만들어줘요.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="lg" onClick={() => startNew()}>
          첫 시나리오 만들기
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {EXAMPLE_CHIPS.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startNew(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  );
}
