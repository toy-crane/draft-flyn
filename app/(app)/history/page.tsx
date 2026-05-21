import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 30;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data: conversations, count } = await supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .range(from, to);

  const scenarioIds = Array.from(
    new Set((conversations ?? []).map((c) => c.scenario_id)),
  );
  const { data: scenarios } =
    scenarioIds.length > 0
      ? await supabase
          .from("scenarios")
          .select("id, summary, situation")
          .in("id", scenarioIds)
      : { data: [] };
  const scenarioById = new Map(
    (scenarios ?? []).map((s) => [s.id, s] as const),
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-xl font-semibold">히스토리</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        종료된 대화 {total}건
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {(conversations ?? []).map((c) => {
          const scenario = scenarioById.get(c.scenario_id);
          return (
            <li key={c.id} className="rounded-md border px-3 py-2">
              <Link
                href={`/conversations/${c.id}/history`}
                className="flex flex-col gap-0.5"
              >
                <span className="truncate text-sm font-medium">
                  {scenario?.summary || scenario?.situation || "삭제된 시나리오"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {c.completed_at
                    ? new Date(c.completed_at).toLocaleDateString("ko-KR")
                    : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/history?page=${page - 1}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/history?page=${page + 1}`}
              className="text-muted-foreground hover:text-foreground"
            >
              다음 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
