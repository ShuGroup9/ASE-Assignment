/**
 * @file src/components/layout/app-shell.tsx
 * @description App chrome: skip link, top navbar (brand, nav links with aria-current, actions slot, theme toggle),
 *              a drawer for small screens, and the <main> landmark that wraps every page.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Shared
 */
"use client";

import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, type Theme } from "./theme";

export interface AppNavLink {
  href: string;
  label: string;
}

export interface AppShellProps {
  /** Brand text */
  productName: string;
  /** Optional suffix shown after the brand */
  productSuffix?: string;
  /** Where the brand links to. */
  homeHref?: string;
  /** Top-level links. Omit for signed-out pages. */
  navigation?: AppNavLink[];
  /** Override for the active-link check; defaults to the current pathname. */
  currentPath?: string;
  /** Right-hand side of the navbar */
  actions?: ReactNode;
  /** Rendered after <main>. */
  footer?: ReactNode;
  children: ReactNode;
}

// The theme attribute is set before hydration by the inline script in src/app/layout.tsx,
// so the DOM is the source of truth and React subscribes to it.
const subscribeToTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [THEME_ATTRIBUTE] });
  return () => observer.disconnect();
};
const getIsDark = () => document.documentElement.getAttribute(THEME_ATTRIBUTE) === "dark";
const getServerIsDark = () => false;
const isActive = (href: string, path: string) => path === href || path.startsWith(`${href}/`);

export function AppShell({
  productName,
  productSuffix,
  homeHref = "/",
  navigation = [],
  currentPath,
  actions,
  footer,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const path = currentPath ?? pathname;

  const drawerRef = useRef<HTMLDialogElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerId = useId();
  const drawerTitleId = `${drawerId}-title`;

  const isDark = useSyncExternalStore(subscribeToTheme, getIsDark, getServerIsDark);

  const toggleTheme = () => {
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this page view.
    }
  };

  // Bootstrap's JS isn't loaded, so the drawer (a native <dialog>) is opened and closed here.
  // ESC and the backdrop close it natively; the "close" event keeps our state in sync.
  const openDrawer = () => {
    drawerRef.current?.showModal();
    setIsDrawerOpen(true);
  };
  const closeDrawer = () => drawerRef.current?.close();

  const brand = productSuffix ? `${productName} - ${productSuffix}` : productName;

  return (
    <>
      <a className="visually-hidden-focusable" href="#main-content">
        Skip to main content
      </a>

      <header>
        <nav className="navbar md:navbar-expand bg-1 fg-2" aria-label="Main">
          <div className="container container-fluid">
            <Link className="navbar-brand" href={homeHref}>
              {brand}
            </Link>

            <button
              className="btn-icon navbar-toggler"
              type="button"
              aria-controls={drawerId}
              aria-expanded={isDrawerOpen}
              aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
              onClick={openDrawer}
            >
              <span className="navbar-toggler-icon" aria-hidden="true" />
            </button>

            <dialog
              ref={drawerRef}
              id={drawerId}
              className="drawer drawer-end"
              aria-labelledby={drawerTitleId}
              onClose={() => setIsDrawerOpen(false)}
            >
              <div className="drawer-header">
                <h2 className="drawer-title h5" id={drawerTitleId}>
                  {brand}
                </h2>
                <button type="button" className="btn-close" aria-label="Close menu" onClick={closeDrawer} />
              </div>

              <div className="drawer-body">
                <ul className="navbar-nav me-auto mb-2 md:mb-0">
                  {navigation.map((link) => {
                    const current = isActive(link.href, path);
                    return (
                      <li className="nav-item" key={link.href}>
                        <Link
                          className={`nav-link${current ? " active" : ""}`}
                          href={link.href}
                          aria-current={current ? "page" : undefined}
                          onClick={closeDrawer}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="d-flex align-items-center gap-2">
                  {actions}
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    aria-pressed={isDark}
                    onClick={toggleTheme}
                  >
                    {isDark ? <SunIcon /> : <MoonIcon />}
                  </button>
                </div>
              </div>
            </dialog>
          </div>
        </nav>
      </header>

      <main id="main-content" className="container py-4" tabIndex={-1}>
        {children}
      </main>

      {footer}
    </>
  );
}

export default AppShell;

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-moon"
       viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278M4.858 1.311A7.27 7.27 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.32 7.32 0 0 0 5.205-2.162q-.506.063-1.029.063c-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286"/>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-sun"
       viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
  </svg>
);
