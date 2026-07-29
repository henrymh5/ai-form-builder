import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressIndicator } from "./progress-indicator";

const progress = { currentStepNumber: 2, totalSteps: 5, percent: 40 };

describe("ProgressIndicator", () => {
  it("renders nothing for mode 'none'", () => {
    const { container } = render(<ProgressIndicator mode="none" progress={progress} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders 'Schritt X von Y' for mode 'steps'", () => {
    render(<ProgressIndicator mode="steps" progress={progress} />);
    expect(screen.getByText("Schritt 2 von 5")).toBeInTheDocument();
  });

  it("renders a percentage for mode 'percent'", () => {
    render(<ProgressIndicator mode="percent" progress={progress} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders an accessible progressbar for mode 'bar'", () => {
    render(<ProgressIndicator mode="bar" progress={progress} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });
});
