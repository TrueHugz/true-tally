import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardView } from "./DashboardView";
import type { LogEntry } from "../data/types";

const entries: LogEntry[] = [
  { entryId: "a", activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
    activityType: "Stock Take", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 5, loggedAt: "x" },
  { entryId: "b", activityDate: "2026-05-01", institution: "NUH Health & U", branch: "Zone B",
    activityType: "Stock Top Up", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 3, loggedAt: "x" },
];

describe("DashboardView", () => {
  it("defaults to Day and shows only today's total", () => {
    render(<DashboardView entries={entries} today="2026-06-05" onExport={vi.fn()} />);
    expect(screen.getByRole("cell", { name: "5" })).toBeInTheDocument();
  });

  it("switches to To-Date and sums everything, then exports", async () => {
    const onExport = vi.fn();
    render(<DashboardView entries={entries} today="2026-06-05" onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "To-Date" }));
    expect(screen.getByRole("cell", { name: "8" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /generate excel report/i }));
    expect(onExport).toHaveBeenCalledWith("toDate");
  });
});
