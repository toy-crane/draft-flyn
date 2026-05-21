import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  afterEach(() => {
    push.mockClear();
  });

  it("renders the headline CTA and 5 example chips", () => {
    render(<EmptyState />);

    expect(screen.getByText("첫 시나리오를 만들어보세요")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "첫 시나리오 만들기" }),
    ).toBeInTheDocument();

    for (const chip of [
      "카페 주문",
      "면접 연습",
      "공항 환승",
      "병원 예약",
      "마트 장보기",
    ]) {
      expect(screen.getByRole("button", { name: chip })).toBeInTheDocument();
    }
  });

  it("routes to /scenarios/new on CTA click", async () => {
    render(<EmptyState />);
    await userEvent.click(
      screen.getByRole("button", { name: "첫 시나리오 만들기" }),
    );
    expect(push).toHaveBeenCalledWith("/scenarios/new");
  });

  it("passes the chip text as a prefill query param", async () => {
    render(<EmptyState />);
    await userEvent.click(screen.getByRole("button", { name: "카페 주문" }));
    expect(push).toHaveBeenCalledWith(
      "/scenarios/new?prefill=%EC%B9%B4%ED%8E%98%20%EC%A3%BC%EB%AC%B8",
    );
  });
});
