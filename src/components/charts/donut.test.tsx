import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Donut } from "./donut";

describe("Donut", () => {
  it("renders a neutral empty-state ring and '–' when every value is 0", () => {
    const { container, getByText } = render(
      <Donut
        ariaLabel="Status"
        segments={[
          { label: "A", value: 0, className: "stroke-primary" },
          { label: "B", value: 0, className: "stroke-teal-300" },
        ]}
      />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(getByText("–")).toBeInTheDocument();
  });

  it("never renders NaN in strokeDasharray/strokeDashoffset for a normal segment set", () => {
    const { container } = render(
      <Donut
        ariaLabel="Status"
        segments={[
          { label: "A", value: 3, className: "stroke-primary" },
          { label: "B", value: 1, className: "stroke-teal-300" },
        ]}
      />,
    );
    for (const circle of container.querySelectorAll("circle")) {
      expect(circle.getAttribute("stroke-dasharray") ?? "").not.toMatch(/NaN/);
      expect(circle.getAttribute("stroke-dashoffset") ?? "").not.toMatch(/NaN/);
    }
  });

  it("handles a single 100% segment without a degenerate arc", () => {
    const { container } = render(
      <Donut
        ariaLabel="Status"
        segments={[{ label: "A", value: 5, className: "stroke-primary" }]}
      />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  it("shows the total in the center label", () => {
    const { getByText } = render(
      <Donut
        ariaLabel="Status"
        segments={[
          { label: "A", value: 3, className: "stroke-primary" },
          { label: "B", value: 4, className: "stroke-teal-300" },
        ]}
      />,
    );
    expect(getByText("7")).toBeInTheDocument();
  });
});
