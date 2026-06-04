import { describe, it, expect } from "vitest";
import { tablesToCreate, REQUIRED_TABLES } from "./graphRepo";

describe("tablesToCreate", () => {
  it("returns all required tables when none exist (fresh file)", () => {
    expect(tablesToCreate([])).toEqual(["Institutions", "Branches", "Products", "Logs"]);
  });
  it("returns only the missing tables (partially provisioned file)", () => {
    expect(tablesToCreate(["Institutions", "Branches"])).toEqual(["Products", "Logs"]);
  });
  it("returns nothing when all required tables exist", () => {
    expect(tablesToCreate([...REQUIRED_TABLES])).toEqual([]);
  });
});
