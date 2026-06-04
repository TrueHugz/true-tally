import { describe, it, expect } from "vitest";
import { makeQueryClient, CACHE_MAX_AGE } from "./queryClient";

describe("queryClient", () => {
  it("sets gcTime >= persister maxAge so the persisted cache is not GC'd early", () => {
    const client = makeQueryClient();
    const gcTime = client.getDefaultOptions().queries?.gcTime;
    expect(gcTime).toBeGreaterThanOrEqual(CACHE_MAX_AGE);
  });
});
