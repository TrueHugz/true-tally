import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "./QuantityStepper";

describe("QuantityStepper", () => {
  it("increments and decrements but never below 0", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(0); // clamped at 0
  });
});
