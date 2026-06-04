import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogEntryView } from "./LogEntryView";

const branches = [{ institution: "NUH Health & U", branch: "Main Building (Zone F)", remarks: "" }];
const products = [{ description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" }];

function setup() {
  const onSave = vi.fn();
  render(
    <LogEntryView
      institution="NUH Health & U" branches={branches} products={products}
      onSave={onSave} onAddBranch={vi.fn()} onAddProduct={vi.fn()} today="2026-06-05"
    />,
  );
  return { onSave };
}

describe("LogEntryView", () => {
  it("blocks save and shows errors when fields are missing", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Select a branch")).toBeInTheDocument();
  });

  it("saves a complete entry with the chosen values", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByLabelText("Branch"));
    await userEvent.click(screen.getByRole("button", { name: "Main Building (Zone F)" }));
    await userEvent.click(screen.getByRole("button", { name: "Stock Top Up" }));
    await userEvent.click(screen.getByLabelText("Product"));
    await userEvent.click(screen.getByRole("button", { name: "CoolGuard (L)" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg).toMatchObject({
      institution: "NUH Health & U", branch: "Main Building (Zone F)",
      activityType: "Stock Top Up", product: "CoolGuard (L)", sku: "CG-L-15",
      quantity: 1, activityDate: "2026-06-05",
    });
  });
});
