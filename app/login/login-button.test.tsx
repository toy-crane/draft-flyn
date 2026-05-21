import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithOAuth },
  }),
}));

import { LoginButton } from "@/app/login/login-button";

describe("LoginButton", () => {
  afterEach(() => {
    signInWithOAuth.mockClear();
  });

  it("renders the Google CTA", () => {
    render(<LoginButton />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeEnabled();
  });

  it("calls signInWithOAuth with provider=google and a callback redirect", async () => {
    render(<LoginButton />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    const call = signInWithOAuth.mock.calls[0][0];
    expect(call.provider).toBe("google");
    expect(call.options.redirectTo).toMatch(/\/auth\/callback$/);
  });
});
