import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import {
  DirtyGuardProvider,
  GuardedLink,
  useDirtyGuard,
} from "@/components/scenarios/dirty-guard";

function TestHarness({ dirty }: { dirty: boolean }) {
  const { setDirty } = useDirtyGuard();
  // toggle dirty via a button so the assertion runs after a state update
  return (
    <>
      <button onClick={() => setDirty(dirty)}>set dirty</button>
      <GuardedLink href="/somewhere">Go</GuardedLink>
    </>
  );
}

describe("DirtyGuard", () => {
  it("clean form → GuardedLink navigates with no dialog", async () => {
    render(
      <DirtyGuardProvider>
        <TestHarness dirty={false} />
      </DirtyGuardProvider>,
    );

    await userEvent.click(screen.getByRole("link", { name: "Go" }));
    expect(
      screen.queryByText("이 시나리오를 저장하지 않을까요?"),
    ).not.toBeInTheDocument();
    // default Link navigation isn't mocked — we just assert no dialog appears.
  });

  it("dirty form → click shows confirm dialog, '계속 작성' keeps form", async () => {
    render(
      <DirtyGuardProvider>
        <TestHarness dirty={true} />
      </DirtyGuardProvider>,
    );

    await userEvent.click(screen.getByText("set dirty"));
    await userEvent.click(screen.getByRole("link", { name: "Go" }));

    expect(
      await screen.findByText("이 시나리오를 저장하지 않을까요?"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "계속 작성" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("dirty form → '저장 안 함' navigates", async () => {
    render(
      <DirtyGuardProvider>
        <TestHarness dirty={true} />
      </DirtyGuardProvider>,
    );

    await userEvent.click(screen.getByText("set dirty"));
    await userEvent.click(screen.getByRole("link", { name: "Go" }));
    await userEvent.click(screen.getByRole("button", { name: "저장 안 함" }));

    expect(push).toHaveBeenCalledWith("/somewhere");
  });
});
