import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renders the product title and a link to the token demo", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Form Creator" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Design-Token-Übersicht ansehen" })).toHaveAttribute(
      "href",
      "/dev/tokens",
    );
  });

  it("links to registration and login", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Kostenlos ausprobieren" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "Anmelden" })).toHaveAttribute("href", "/login");
  });

  it("shows the non-commercial portfolio disclaimer", () => {
    render(<Home />);

    expect(screen.getByText("Portfolio-Projekt")).toBeInTheDocument();
    expect(screen.getByText(/ohne kommerzielle Absicht/)).toBeInTheDocument();
  });
});
