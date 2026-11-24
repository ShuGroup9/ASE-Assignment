/**
 * @file src/components/layout/theme.ts
 * @description Theme constants and the pre-hydration script shared by the root layout (server) and AppShell (client).
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Shared
 */

export const THEME_ATTRIBUTE = "data-bs-theme";
export const THEME_STORAGE_KEY = "bs-theme";
export type Theme = "light" | "dark";

/**
 * Inline script for <head>: applies the saved theme, or the OS preference, before first paint
 * so there is no flash of the wrong colours. Must be rendered with the CSP nonce.
 */
export const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t)}catch(e){}`;
