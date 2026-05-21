import type { Database } from "@/types/database";

export type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
export type ScenarioInsert = Database["public"]["Tables"]["scenarios"]["Insert"];
export type ScenarioUpdate = Database["public"]["Tables"]["scenarios"]["Update"];

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationUpdate =
  Database["public"]["Tables"]["conversations"]["Update"];

export type { Goal } from "@/lib/ai/gateway";
