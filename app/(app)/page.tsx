import { EmptyState } from "@/components/empty-state";
import { getScenariosForSidebar } from "@/lib/data/scenarios";

export default async function HomePage() {
  const scenarios = await getScenariosForSidebar();

  if (scenarios.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <EmptyState />
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="text-muted-foreground max-w-md text-center text-sm">
        <p>왼쪽 사이드바에서 시나리오를 선택하거나, 새로 만들어 보세요.</p>
      </div>
    </main>
  );
}
