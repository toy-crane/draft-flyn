import type { Metadata } from "next";

import { LoginButton } from "./login-button";

export const metadata: Metadata = {
  title: "Flyn — 로그인",
};

export default function LoginPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Flyn</h1>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          AI와 카톡처럼 영어로 채팅하면서, 메시지가 맞는지 즉시 확인하세요.
        </p>
      </div>
      <LoginButton />
    </main>
  );
}
