import { DirtyGuardProvider } from "@/components/scenarios/dirty-guard";
import { AppShell } from "@/components/sidebar/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DirtyGuardProvider>
      <AppShell>{children}</AppShell>
    </DirtyGuardProvider>
  );
}
