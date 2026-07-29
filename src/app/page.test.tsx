import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { getCurrentUser } from "@/lib/db/repositories/profile";

vi.mock("@/lib/db/repositories/profile", () => ({ getCurrentUser: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

/** `Home` is an async Server Component, so it must be awaited before handing it to `render`. */
async function renderHome() {
  render(await Home());
}

describe("Home page", () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockResolvedValue(null);
  });

  it("renders the product title and a link to the token demo", async () => {
    await renderHome();

    expect(screen.getByRole("heading", { name: "FormCraft" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Design-Token-Übersicht ansehen" })).toHaveAttribute(
      "href",
      "/dev/tokens",
    );
  });

  it("links to registration and login when signed out", async () => {
    await renderHome();

    expect(screen.getByRole("link", { name: "Kostenlos ausprobieren" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "Anmelden" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Zum Dashboard" })).not.toBeInTheDocument();
  });

  it("offers the dashboard instead of auth links when signed in", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "someone@example.com",
      displayName: "Someone",
      avatarUrl: null,
    });

    await renderHome();

    expect(screen.getByRole("link", { name: "Zum Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Kostenlos ausprobieren" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Anmelden" })).not.toBeInTheDocument();
  });

  it("shows the non-commercial portfolio disclaimer", async () => {
    await renderHome();

    expect(screen.getByText("Portfolio-Projekt")).toBeInTheDocument();
    expect(screen.getByText(/ohne kommerzielle Absicht/)).toBeInTheDocument();
  });
});
