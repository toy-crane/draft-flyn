import { GuardedLink as Link } from "@/components/scenarios/dirty-guard";
import { PlusIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScenarioActions } from "@/components/scenarios/scenario-actions";
import {
  getRecentHistory,
  getScenariosForSidebar,
} from "@/lib/data/scenarios";
import { createClient } from "@/lib/supabase/server";

import { SidebarUserMenu } from "./sidebar-user-menu";

export async function AppSidebar() {
  const supabase = await createClient();
  const [{ data: userData }, scenarios, history] = await Promise.all([
    supabase.auth.getUser(),
    getScenariosForSidebar(),
    getRecentHistory(),
  ]);
  const user = userData.user;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Button asChild size="sm" className="w-full justify-start">
          <Link href="/scenarios/new">
            <PlusIcon data-icon="inline-start" />
            새 시나리오
          </Link>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        {scenarios.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>내 시나리오</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {scenarios.map((scenario) => (
                  <SidebarMenuItem key={scenario.id}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={`/scenarios/${scenario.id}`}
                        className="flex w-full items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {scenario.summary || scenario.situation}
                        </span>
                        {scenario.in_progress_conversation_id && (
                          <span
                            aria-label="진행 중"
                            className="text-primary shrink-0"
                          >
                            ▸
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction asChild showOnHover>
                      <ScenarioActions scenarioId={scenario.id} />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {history.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>히스토리</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {history.map((item) => (
                  <SidebarMenuItem key={item.conversation_id}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={`/conversations/${item.conversation_id}/history`}
                      >
                        <span className="truncate">
                          {item.scenario_summary || item.scenario_situation}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              {history.length >= 30 && (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/history" className="text-muted-foreground">
                        전체 보기 →
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        {user && <SidebarUserMenu email={user.email ?? ""} />}
      </SidebarFooter>
    </Sidebar>
  );
}
