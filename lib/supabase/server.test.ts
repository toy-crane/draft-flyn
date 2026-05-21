import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireEnv } from "@/lib/supabase/server";

describe("lib/supabase/server requireEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("throws when the env var is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => requireEnv("NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      /Missing environment variable: NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("throws when the env var is empty", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    expect(() => requireEnv("NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      /Missing environment variable/,
    );
  });

  it("returns the value when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).toBe(
      "https://example.supabase.co",
    );
  });
});
