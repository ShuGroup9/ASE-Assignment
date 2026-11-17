// Loaded before every component test (vitest.config.ts -> component project -> setupFiles).
import "@testing-library/jest-dom/vitest"; // adds matchers like toBeInTheDocument(), toHaveTextContent()
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount whatever the previous test rendered.
afterEach(cleanup);
