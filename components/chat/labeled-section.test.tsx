import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  LabeledSection,
  LabeledSectionContent,
} from "@/components/chat/labeled-section";

describe("LabeledSection", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("renders the correct icon for each kind", () => {
    const { rerender } = render(
      <LabeledSection kind="correction">
        <p>body</p>
      </LabeledSection>,
    );
    expect(screen.getByText(/✱/)).toBeInTheDocument();

    rerender(
      <LabeledSection kind="alternative">
        <p>body</p>
      </LabeledSection>,
    );
    expect(screen.getByText(/💡/)).toBeInTheDocument();

    rerender(
      <LabeledSection kind="translation">
        <p>body</p>
      </LabeledSection>,
    );
    expect(screen.getByText(/🌐/)).toBeInTheDocument();
  });

  it("starts expanded and toggles via header click", async () => {
    render(
      <LabeledSection kind="correction" storageKey="msg-1:correction">
        <LabeledSectionContent
          primary="I went to school"
          secondary="went 사용"
        />
      </LabeledSection>,
    );
    expect(screen.getByText("I went to school")).toBeInTheDocument();
    const header = screen.getByRole("button");
    await userEvent.click(header);
    expect(screen.queryByText("I went to school")).not.toBeInTheDocument();
    await userEvent.click(header);
    expect(screen.getByText("I went to school")).toBeInTheDocument();
  });

  it("persists collapsed state in localStorage by key", async () => {
    const { unmount } = render(
      <LabeledSection kind="correction" storageKey="persist-1:correction">
        <p>body</p>
      </LabeledSection>,
    );
    await userEvent.click(screen.getByRole("button"));
    unmount();
    expect(
      localStorage.getItem("labeled-section:persist-1:correction"),
    ).toBe("0");

    render(
      <LabeledSection kind="correction" storageKey="persist-1:correction">
        <p>body</p>
      </LabeledSection>,
    );
    expect(screen.queryByText("body")).not.toBeInTheDocument();
  });
});
