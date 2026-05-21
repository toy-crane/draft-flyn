import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DirtyGuardProvider } from "@/components/scenarios/dirty-guard";
import { ScenarioForm } from "@/components/scenarios/scenario-form";

function renderForm(ui: React.ReactElement) {
  return render(<DirtyGuardProvider>{ui}</DirtyGuardProvider>);
}

describe("ScenarioForm", () => {
  const noopFill = vi.fn(async () => "");
  const noopChips = vi.fn(async () => [] as string[]);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("disables 다음 until the 3 required fields are filled", async () => {
    const onSubmit = vi.fn();
    renderForm(
      <ScenarioForm
        submitting={false}
        onSubmit={onSubmit}
        fillField={noopFill}
        suggestChips={noopChips}
      />,
    );

    const button = screen.getByRole("button", { name: "다음" });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/상황/), "카페에서");
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/상대방 역할/), "바리스타");
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/내 역할/), "손님");
    expect(button).toBeEnabled();
  });

  it("emits trimmed values on submit", async () => {
    const onSubmit = vi.fn();
    renderForm(
      <ScenarioForm
        submitting={false}
        onSubmit={onSubmit}
        fillField={noopFill}
        suggestChips={noopChips}
      />,
    );

    await userEvent.type(screen.getByLabelText(/상황/), "  카페에서  ");
    await userEvent.type(screen.getByLabelText(/상대방 역할/), "바리스타");
    await userEvent.type(screen.getByLabelText(/내 역할/), "손님");
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(onSubmit).toHaveBeenCalledWith({
      situation: "카페에서",
      theirRole: "바리스타",
      myRole: "손님",
      memo: null,
    });
  });

  it("calls fillField on the field-level ✨ button", async () => {
    const fillField = vi.fn(async () => "바리스타");
    renderForm(
      <ScenarioForm
        submitting={false}
        onSubmit={vi.fn()}
        fillField={fillField}
        suggestChips={noopChips}
      />,
    );

    // Sparkle buttons are aria-label="AI로 채우기" by default.
    const sparkles = screen.getAllByRole("button", { name: "AI로 채우기" });
    // There are 4 (one per field). Click the second one (their_role).
    await userEvent.click(sparkles[1]);

    expect(fillField).toHaveBeenCalledWith("their_role", expect.any(Object));
    // After the call, the their_role input should be populated.
    expect(screen.getByLabelText(/상대방 역할/)).toHaveValue("바리스타");
  });
});
