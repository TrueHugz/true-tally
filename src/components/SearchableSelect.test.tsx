import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableSelect } from "./SearchableSelect";

const options = [
  { value: "CG-L-15", label: "CoolGuard (L)" },
  { value: "CC-M-15", label: "CoolComfort (M)" },
];

describe("SearchableSelect", () => {
  it("filters options by typed text and selects one", async () => {
    const onSelect = vi.fn();
    render(<SearchableSelect label="Product" options={options} value="" onSelect={onSelect} onAddNew={vi.fn()} addNewLabel="+ Add product" />);
    await userEvent.click(screen.getByLabelText("Product"));
    await userEvent.type(screen.getByLabelText("Product"), "comfort");
    expect(screen.queryByRole("button", { name: "CoolGuard (L)" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "CoolComfort (M)" }));
    expect(onSelect).toHaveBeenCalledWith("CC-M-15");
  });

  it("offers add-new when the typed text matches nothing", async () => {
    const onAddNew = vi.fn();
    render(<SearchableSelect label="Product" options={options} value="" onSelect={vi.fn()} onAddNew={onAddNew} addNewLabel="+ Add product" />);
    await userEvent.type(screen.getByLabelText("Product"), "Brand New");
    await userEvent.click(screen.getByRole("button", { name: "+ Add product" }));
    expect(onAddNew).toHaveBeenCalledWith("Brand New");
  });
});
