import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScenarioPreview } from "@/components/scenarios/scenario-preview";

const fields = {
  situation: "카페에서",
  theirRole: "바리스타",
  myRole: "손님",
  memo: null,
};

const preview = {
  summary: "Bluebird Coffee에서 손님으로 라떼 주문하기",
  goals: [
    { id: 0, en: "Order a latte", ko: "음료 주문하기" },
    { id: 1, en: "Specify the size", ko: "사이즈 명시하기" },
    { id: 2, en: "Pay by card", ko: "결제 의사 표현하기" },
  ],
};

describe("ScenarioPreview", () => {
  it("renders summary and 3 goal cards", () => {
    render(
      <ScenarioPreview
        fields={fields}
        preview={preview}
        starting={false}
        onRegenerateGoal={async (id) => preview.goals.find((g) => g.id === id)!}
        onStart={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Bluebird Coffee에서 손님으로 라떼 주문하기"),
    ).toBeInTheDocument();
    expect(screen.getByText("Order a latte")).toBeInTheDocument();
    expect(screen.getByText("음료 주문하기")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "목표 재생성" })).toHaveLength(
      3,
    );
  });

  it("does not expose any input for editing goal text directly", () => {
    render(
      <ScenarioPreview
        fields={fields}
        preview={preview}
        starting={false}
        onRegenerateGoal={async (id) => preview.goals.find((g) => g.id === id)!}
        onStart={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("only replaces the regenerated goal — the others stay put", async () => {
    const onRegenerateGoal = vi.fn(async (id: number) => ({
      id,
      en: "Ask for oat milk",
      ko: "오트 우유 요청하기",
    }));

    render(
      <ScenarioPreview
        fields={fields}
        preview={preview}
        starting={false}
        onRegenerateGoal={onRegenerateGoal}
        onStart={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button", { name: "목표 재생성" });
    await userEvent.click(buttons[1]);

    expect(onRegenerateGoal).toHaveBeenCalledWith(1);
    expect(screen.getByText("Ask for oat milk")).toBeInTheDocument();
    // The other two stay intact.
    expect(screen.getByText("Order a latte")).toBeInTheDocument();
    expect(screen.getByText("Pay by card")).toBeInTheDocument();
  });
});
