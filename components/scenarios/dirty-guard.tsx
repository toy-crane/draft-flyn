"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DirtyGuardContextValue = {
  isDirty: boolean;
  setDirty: (next: boolean) => void;
  /** Returns true when the user confirms discard, false to stay on the form. */
  prompt: () => Promise<boolean>;
};

const DirtyGuardContext = createContext<DirtyGuardContextValue | null>(null);

export function useDirtyGuard() {
  const ctx = useContext(DirtyGuardContext);
  if (!ctx) {
    throw new Error("useDirtyGuard must be used inside DirtyGuardProvider");
  }
  return ctx;
}

export function DirtyGuardProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolveRef = useRef<((proceed: boolean) => void) | null>(null);

  const prompt = useCallback(() => {
    if (!isDirty) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogOpen(true);
    });
  }, [isDirty]);

  function close(proceed: boolean) {
    setDialogOpen(false);
    if (proceed) setDirty(false);
    resolveRef.current?.(proceed);
    resolveRef.current = null;
  }

  // Native browser navigation (close tab, reload, back) — fallback gate.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return (
    <DirtyGuardContext.Provider value={{ isDirty, setDirty, prompt }}>
      {children}
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 시나리오를 저장하지 않을까요?</AlertDialogTitle>
            <AlertDialogDescription>
              입력하신 내용이 사라져요. 계속 작성하거나, 저장 없이 떠날 수 있어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              계속 작성
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => close(true)}>
              저장 안 함
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DirtyGuardContext.Provider>
  );
}

export type GuardedLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "onClick"
> & {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * <Link> that consults the DirtyGuard context before navigating. When the form
 * is dirty, opens the confirmation dialog and only navigates if the user
 * picks "저장 안 함".
 */
export function GuardedLink({
  href,
  onClick,
  children,
  ...rest
}: GuardedLinkProps) {
  const router = useRouter();
  const { isDirty, prompt } = useDirtyGuard();

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    if (!isDirty) return; // default Link navigation
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const proceed = await prompt();
    if (proceed) router.push(href.toString());
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
