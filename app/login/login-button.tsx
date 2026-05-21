"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={signIn}
      disabled={pending}
      className="w-full max-w-xs"
    >
      Continue with Google
    </Button>
  );
}
