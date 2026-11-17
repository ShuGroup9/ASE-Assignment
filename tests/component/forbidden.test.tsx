/** EXAMPLE component test; renders a React component in a simulated browser (jsdom). */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Forbidden from "@/app/forbidden";

describe("<Forbidden />", () => {
  it("explains the user has no access, as a page heading", () => {
    render(<Forbidden />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/have access to this page/i);
  });
});
