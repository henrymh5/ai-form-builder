import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiStrip } from "./kpi-strip";

describe("KpiStrip", () => {
  it("renders every item's label and value", () => {
    render(
      <KpiStrip
        items={[
          {
            label: "Aufrufe",
            value: "1.284",
            delta: { direction: "up", ratio: 0.12 },
            spark: [1, 2, 3],
          },
          {
            label: "Gestartet",
            value: "412",
            delta: { direction: "flat", ratio: 0 },
            spark: [1, 1],
          },
          {
            label: "Antworten",
            value: "118",
            delta: { direction: "down", ratio: -0.05 },
            spark: [3, 2],
          },
          {
            label: "Completion Rate",
            value: "29%",
            delta: { direction: "up", ratio: null },
            spark: [],
          },
        ]}
      />,
    );

    expect(screen.getByText("Aufrufe")).toBeInTheDocument();
    expect(screen.getByText("1.284")).toBeInTheDocument();
    expect(screen.getByText("Gestartet")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.getByText("Antworten")).toBeInTheDocument();
    expect(screen.getByText("118")).toBeInTheDocument();
    expect(screen.getByText("Completion Rate")).toBeInTheDocument();
    expect(screen.getByText("29%")).toBeInTheDocument();
  });

  it("shows a delta as an arrow glyph plus text, not color alone", () => {
    const { container } = render(
      <KpiStrip
        items={[
          { label: "Aufrufe", value: "10", delta: { direction: "up", ratio: 0.2 }, spark: [1, 2] },
        ]}
      />,
    );
    expect(screen.getByText("+20%")).toBeInTheDocument();
    // The arrow icon renders as an inline svg alongside the text — never the sole indicator.
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
