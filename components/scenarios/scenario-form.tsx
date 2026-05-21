"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDirtyGuard } from "@/components/scenarios/dirty-guard";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ScenarioFields } from "@/lib/ai/scenarios";

import { RecommendationChips } from "./recommendation-chips";
import { SparkleButton } from "./sparkle-button";

type FieldKey = "situation" | "their_role" | "my_role" | "memo";

const SITUATION_DEFAULT_CHIPS = [
  "카페에서",
  "면접",
  "공항 환승",
  "병원 예약",
  "마트 장보기",
  "호텔 체크인",
  "택시 안",
];

export type ScenarioFormProps = {
  initialFields?: Partial<ScenarioFields>;
  submitting: boolean;
  onSubmit: (fields: ScenarioFields) => void;
  fillField: (
    field: FieldKey,
    context: Partial<ScenarioFields>,
  ) => Promise<string>;
  suggestChips: (
    field: "their_role" | "my_role",
    context: Partial<ScenarioFields>,
  ) => Promise<string[]>;
};

export function ScenarioForm({
  initialFields,
  submitting,
  onSubmit,
  fillField,
  suggestChips,
}: ScenarioFormProps) {
  const [situation, setSituation] = useState(initialFields?.situation ?? "");
  const [theirRole, setTheirRole] = useState(initialFields?.theirRole ?? "");
  const [myRole, setMyRole] = useState(initialFields?.myRole ?? "");
  const [memo, setMemo] = useState(initialFields?.memo ?? "");
  const [pendingField, setPendingField] = useState<FieldKey | "all" | null>(
    null,
  );
  const [theirRoleChips, setTheirRoleChips] = useState<string[]>([]);
  const [myRoleChips, setMyRoleChips] = useState<string[]>([]);
  const [chipsLoading, setChipsLoading] = useState<
    "their_role" | "my_role" | null
  >(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fields: ScenarioFields = {
    situation: situation.trim(),
    theirRole: theirRole.trim(),
    myRole: myRole.trim(),
    memo: memo.trim() || null,
  };
  const canSubmit =
    fields.situation.length > 0 &&
    fields.theirRole.length > 0 &&
    fields.myRole.length > 0;

  const { setDirty } = useDirtyGuard();
  const isDirty =
    situation.trim().length > 0 ||
    theirRole.trim().length > 0 ||
    myRole.trim().length > 0 ||
    memo.trim().length > 0;

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  // Debounced chip refresh whenever upstream values change.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!situation.trim()) {
      setTheirRoleChips([]);
      setMyRoleChips([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void refreshChips();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situation, theirRole]);

  async function refreshChips() {
    if (!situation.trim()) return;
    setChipsLoading("their_role");
    try {
      const next = await suggestChips("their_role", {
        situation: situation.trim(),
      });
      setTheirRoleChips(next);
    } finally {
      setChipsLoading(null);
    }
    if (theirRole.trim()) {
      setChipsLoading("my_role");
      try {
        const next = await suggestChips("my_role", {
          situation: situation.trim(),
          theirRole: theirRole.trim(),
        });
        setMyRoleChips(next);
      } finally {
        setChipsLoading(null);
      }
    } else {
      setMyRoleChips([]);
    }
  }

  async function autoFill(field: FieldKey) {
    setPendingField(field);
    try {
      const value = await fillField(field, fields);
      if (field === "situation") setSituation(value);
      else if (field === "their_role") setTheirRole(value);
      else if (field === "my_role") setMyRole(value);
      else setMemo(value);
    } finally {
      setPendingField(null);
    }
  }

  async function autoFillAll() {
    setPendingField("all");
    try {
      // Sequential so each call sees the previously filled values.
      const ctx: Partial<ScenarioFields> = {};
      const next: Partial<ScenarioFields> = {};
      if (!situation.trim()) {
        next.situation = await fillField("situation", ctx);
        setSituation(next.situation);
      } else {
        next.situation = situation.trim();
      }
      ctx.situation = next.situation;
      if (!theirRole.trim()) {
        next.theirRole = await fillField("their_role", ctx);
        setTheirRole(next.theirRole);
      } else {
        next.theirRole = theirRole.trim();
      }
      ctx.theirRole = next.theirRole;
      if (!myRole.trim()) {
        next.myRole = await fillField("my_role", ctx);
        setMyRole(next.myRole);
      }
    } finally {
      setPendingField(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(fields);
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">새 시나리오</h1>
          <p className="text-muted-foreground text-sm">
            상황과 역할을 알려주면 AI가 학습 목표를 만들어요.
          </p>
        </div>
        <SparkleButton
          onClick={autoFillAll}
          loading={pendingField === "all"}
          label="AI에게 전부 맡기기"
          variant="outline"
          size="sm"
        />
      </div>

      <FieldGroup>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="situation">상황 *</FieldLabel>
            <SparkleButton
              onClick={() => autoFill("situation")}
              loading={pendingField === "situation"}
            />
          </div>
          <Input
            id="situation"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="예: 카페에서"
            autoComplete="off"
          />
          <FieldDescription>
            <RecommendationChips
              chips={SITUATION_DEFAULT_CHIPS}
              onPick={setSituation}
            />
          </FieldDescription>
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="their_role">상대방 역할 *</FieldLabel>
            <SparkleButton
              onClick={() => autoFill("their_role")}
              loading={pendingField === "their_role"}
            />
          </div>
          <Input
            id="their_role"
            value={theirRole}
            onChange={(e) => setTheirRole(e.target.value)}
            placeholder="예: 바리스타"
            autoComplete="off"
          />
          {situation.trim() && (
            <FieldDescription>
              <RecommendationChips
                chips={theirRoleChips}
                onPick={setTheirRole}
                loading={chipsLoading === "their_role"}
              />
            </FieldDescription>
          )}
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="my_role">내 역할 *</FieldLabel>
            <SparkleButton
              onClick={() => autoFill("my_role")}
              loading={pendingField === "my_role"}
            />
          </div>
          <Input
            id="my_role"
            value={myRole}
            onChange={(e) => setMyRole(e.target.value)}
            placeholder="예: 손님"
            autoComplete="off"
          />
          {theirRole.trim() && (
            <FieldDescription>
              <RecommendationChips
                chips={myRoleChips}
                onPick={setMyRole}
                loading={chipsLoading === "my_role"}
              />
            </FieldDescription>
          )}
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="memo">추가 메모</FieldLabel>
            <SparkleButton
              onClick={() => autoFill("memo")}
              loading={pendingField === "memo"}
            />
          </div>
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 비건이라 우유 못 마심"
            rows={3}
          />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={!canSubmit || submitting} size="lg">
        {submitting ? "목표 만드는 중…" : "다음"}
      </Button>
    </form>
  );
}
