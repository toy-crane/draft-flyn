"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CompletionPromptDialog({
  open,
  onContinue,
  onFinish,
  finishing,
}: {
  open: boolean;
  onContinue: () => void;
  onFinish: () => void;
  finishing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onContinue() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>목표 다 했어요! 끝낼까요?</DialogTitle>
          <DialogDescription>
            3개 목표를 모두 달성했어요. 여기서 종료하거나 자유롭게 더 대화를 이어갈 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onContinue}>
            더 대화
          </Button>
          <Button type="button" onClick={onFinish} disabled={finishing}>
            {finishing ? "종료 중…" : "끝내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
