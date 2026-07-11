import { describe, expect, it } from "vitest";
import { orderServiceKeys } from "./RoleList";

const BASIC_KEY = "__basic__";

describe("orderServiceKeys", () => {
  it("puts basic roles first, then directly pinned services, then services with pinned roles, then the rest — each alphabetical", () => {
    const keys = ["zeta", "alpha", BASIC_KEY, "storage", "bigquery", "compute"];
    const result = orderServiceKeys(
      keys,
      ["storage", "bigquery"], // directly pinned
      new Set(["compute"]), // contains pinned roles only
    );
    expect(result).toEqual([
      BASIC_KEY,
      "bigquery",
      "storage",
      "compute",
      "alpha",
      "zeta",
    ]);
  });

  it("treats a service that is both directly pinned and contains pinned roles as directly pinned", () => {
    const result = orderServiceKeys(
      ["storage", "compute"],
      ["storage"],
      new Set(["storage", "compute"]),
    );
    expect(result).toEqual(["storage", "compute"]);
  });

  it("omits basic key when absent from the input", () => {
    const result = orderServiceKeys(["b", "a"], [], new Set());
    expect(result).toEqual(["a", "b"]);
  });

  it("returns an empty array for empty input", () => {
    expect(orderServiceKeys([], ["storage"], new Set(["compute"]))).toEqual([]);
  });

  it("ignores pinned services / pinned-role services not present in keys", () => {
    const result = orderServiceKeys(
      ["alpha"],
      ["storage"],
      new Set(["compute"]),
    );
    expect(result).toEqual(["alpha"]);
  });
});
