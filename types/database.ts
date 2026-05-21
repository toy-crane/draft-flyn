// Hand-written Supabase database type until `supabase gen types typescript --linked`
// is wired into the dev workflow. Mirrors supabase/migrations/0001_init.sql.

import type { Correction, Goal } from "@/lib/ai/gateway";

export type ConversationStatus = "in_progress" | "completed";
export type MessageRole = "user" | "assistant";

export type Database = {
  public: {
    Tables: {
      scenarios: {
        Row: {
          id: string;
          user_id: string;
          situation: string;
          their_role: string;
          my_role: string;
          memo: string | null;
          summary: string;
          goals: Goal[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          situation: string;
          their_role: string;
          my_role: string;
          memo?: string | null;
          summary?: string;
          goals?: Goal[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          situation?: string;
          their_role?: string;
          my_role?: string;
          memo?: string | null;
          summary?: string;
          goals?: Goal[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          scenario_id: string;
          user_id: string;
          status: ConversationStatus;
          goals_achieved: number[];
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          scenario_id: string;
          user_id: string;
          status?: ConversationStatus;
          goals_achieved?: number[];
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          scenario_id?: string;
          user_id?: string;
          status?: ConversationStatus;
          goals_achieved?: number[];
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: MessageRole;
          original_text: string;
          english_text: string | null;
          correction: Correction | null;
          goals_achieved: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: MessageRole;
          original_text: string;
          english_text?: string | null;
          correction?: Correction | null;
          goals_achieved?: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: MessageRole;
          original_text?: string;
          english_text?: string | null;
          correction?: Correction | null;
          goals_achieved?: number[];
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
