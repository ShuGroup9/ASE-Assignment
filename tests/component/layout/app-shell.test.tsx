/**
 * @file tests/component/layout/app-shell.test.tsx
 * @description AppShell: brand, skip link and landmarks, active nav link, actions/footer slots, drawer open/close and theme toggle.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Shared
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { AppShell, type AppShellProps } from "@/components/layout/app-shell";
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from "@/components/layout/theme";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));

const adminNav = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

function renderShell(props: Partial<AppShellProps> = {}) {
  return render(
    <AppShell productName="EngageTrack 2.0" {...props}>
      <h1>Page content</h1>
    </AppShell>,
  );
}


const hidden = { hidden: true } as const;
const drawer = () => screen.getByRole("dialog", hidden);
const openMenuButton = () => {
  const [toggle] = screen.getAllByRole("button", hidden).filter((b) => b.hasAttribute("aria-expanded"));
  if (!toggle) throw new Error("menu toggle not found");
  return toggle;
};

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
});

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("<AppShell /> brand", () => {
  it("links the product name to the home page", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "EngageTrack 2.0" })).toHaveAttribute("href", "/");
  });

  it("appends the suffix 'EngageTrack 2.0 - Admin'", () => {
    renderShell({ productSuffix: "Admin" });

    expect(screen.getByRole("link", { name: "EngageTrack 2.0 - Admin" })).toBeInTheDocument();
  });

  it("uses a custom home link", () => {
    renderShell({ homeHref: "/admin/users" });

    expect(screen.getByRole("link", { name: "EngageTrack 2.0" })).toHaveAttribute("href", "/admin/users");
  });
});

describe("<AppShell /> landmarks and skip link", () => {
  it("renders header, labelled navigation and main landmarks", () => {
    renderShell();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Page content" }));
  });

  it("has exactly one main landmark", () => {
    renderShell();

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("starts with a skip link that targets a focusable <main>", () => {
    const { container } = renderShell();

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(container.querySelector("a")).toBe(skip);
    expect(skip).toHaveAttribute("href", "#main-content");

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });
});

describe("<AppShell /> navigation", () => {
  it("renders each link with its href", () => {
    renderShell({ navigation: adminNav });

    expect(screen.getByRole("link", { ...hidden, name: "Users" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { ...hidden, name: "Audit log" })).toHaveAttribute("href", "/admin/audit");
  });

  it("renders no nav links when navigation is omitted (signed-out pages)", () => {
    renderShell();

    expect(within(drawer()).queryAllByRole("link", hidden)).toHaveLength(0);
  });

  it("marks the link for the current path with aria-current and .active", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/audit");
    renderShell({ navigation: adminNav });

    const audit = screen.getByRole("link", { ...hidden, name: "Audit log" });
    const users = screen.getByRole("link", { ...hidden, name: "Users" });
    expect(audit).toHaveAttribute("aria-current", "page");
    expect(audit).toHaveClass("active");
    expect(users).not.toHaveAttribute("aria-current");
    expect(users).not.toHaveClass("active");
  });

  it("keeps the parent link active on a nested page", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users/123");
    renderShell({ navigation: adminNav });

    expect(screen.getByRole("link", { ...hidden, name: "Users" })).toHaveAttribute("aria-current", "page");
  });

  it("does not treat a path that only shares a prefix as active", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users-archive");
    renderShell({ navigation: adminNav });

    expect(screen.getByRole("link", { ...hidden, name: "Users" })).not.toHaveAttribute("aria-current");
  });

  it("lets currentPath override the router pathname", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users");
    renderShell({ navigation: adminNav, currentPath: "/admin/audit" });

    expect(screen.getByRole("link", { ...hidden, name: "Audit log" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { ...hidden, name: "Users" })).not.toHaveAttribute("aria-current");
  });
});

describe("<AppShell /> slots", () => {
  it("renders actions inside the navbar", () => {
    renderShell({ actions: <button type="button">Sign out</button> });

    const signOut = screen.getByRole("button", { ...hidden, name: "Sign out" });
    expect(screen.getByRole("navigation", { name: "Main" })).toContainElement(signOut);
  });

  it("renders the footer after <main>", () => {
    renderShell({ footer: <footer>Footer text</footer> });

    const main = screen.getByRole("main");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Footer text");
    expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("<AppShell /> drawer (small screens)", () => {
  it("starts closed, and the menu button points at the drawer", () => {
    renderShell();

    const button = openMenuButton();
    expect(button).toHaveAccessibleName("Open menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", drawer().id);
    expect(drawer()).not.toHaveAttribute("open");
  });

  it("is labelled by its title", () => {
    renderShell({ productSuffix: "Admin" });
    fireEvent.click(openMenuButton());

    expect(screen.getByRole("dialog")).toHaveAccessibleName("EngageTrack 2.0 - Admin");
  });

  it("opens from the menu button and updates aria-expanded", () => {
    renderShell({ navigation: adminNav });

    fireEvent.click(openMenuButton());

    expect(drawer()).toHaveAttribute("open");
    expect(openMenuButton()).toHaveAttribute("aria-expanded", "true");
    expect(openMenuButton()).toHaveAccessibleName("Close menu");
    // Now visible, so reachable without { hidden: true }
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Users" })).toBeVisible();
  });

  it("closes from the close button", () => {
    renderShell();
    fireEvent.click(openMenuButton());

    fireEvent.click(within(drawer()).getByRole("button", { name: "Close menu" }));

    expect(drawer()).not.toHaveAttribute("open");
    expect(openMenuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when a nav link is chosen", () => {
    renderShell({ navigation: adminNav });
    fireEvent.click(openMenuButton());

    fireEvent.click(screen.getByRole("link", { name: "Audit log" }));

    expect(drawer()).not.toHaveAttribute("open");
    expect(openMenuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("stays in sync when the browser closes it (ESC / backdrop fire 'close')", () => {
    renderShell();
    fireEvent.click(openMenuButton());

    act(() => (drawer() as HTMLDialogElement).close());

    expect(openMenuButton()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("<AppShell /> theme toggle", () => {
  const themeButton = () => screen.getByRole("button", { ...hidden, name: /switch to (dark|light) theme/i });

  it("defaults to light when no theme is set", () => {
    renderShell();

    expect(themeButton()).toHaveAccessibleName("Switch to dark theme");
    expect(themeButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects a theme already applied by the <head> script", () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, "dark");
    renderShell();

    expect(themeButton()).toHaveAccessibleName("Switch to light theme");
    expect(themeButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("switches to dark, saves the choice, and switches back", async () => {
    renderShell();

    fireEvent.click(themeButton());
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, "dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await waitFor(() => expect(themeButton()).toHaveAccessibleName("Switch to light theme"));

    fireEvent.click(themeButton());
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, "light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    await waitFor(() => expect(themeButton()).toHaveAccessibleName("Switch to dark theme"));
  });

  it("updates when the theme attribute changes outside React", async () => {
    renderShell();

    document.documentElement.setAttribute(THEME_ATTRIBUTE, "dark");

    await waitFor(() => expect(themeButton()).toHaveAttribute("aria-pressed", "true"));
  });

  it("still applies the theme when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    renderShell();

    expect(() => fireEvent.click(themeButton())).not.toThrow();
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, "dark");
    await waitFor(() => expect(themeButton()).toHaveAttribute("aria-pressed", "true"));
  });
});
