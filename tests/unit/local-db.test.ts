import { describe, expect, it } from "vitest";
import { clearLocalRosters, loadLocalRoster, storeLocalRoster } from "../../src/lib/local-db";

describe("server-side local roster storage", () => {
  it("does not access IndexedDB during server rendering", async () => {
    expect(typeof indexedDB).toBe("undefined");

    await expect(storeLocalRoster("workspace", [])).resolves.toBeUndefined();
    await expect(loadLocalRoster("workspace")).resolves.toBeUndefined();
    await expect(clearLocalRosters()).resolves.toBeUndefined();
  });
});
