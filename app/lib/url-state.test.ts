import { describe, expect, it } from "vitest";
import {
  encodeSel,
  parseHighlight,
  parseSel,
  sameItem,
  stripWildcard,
} from "./url-state";

describe("sameItem", () => {
  it("is true when type and name both match", () => {
    expect(
      sameItem(
        { type: "r", name: "bigquery.user" },
        { type: "r", name: "bigquery.user" },
      ),
    ).toBe(true);
  });

  it("is false when the type differs", () => {
    expect(
      sameItem(
        { type: "r", name: "bigquery.user" },
        { type: "p", name: "bigquery.user" },
      ),
    ).toBe(false);
  });

  it("is false when the name differs", () => {
    expect(
      sameItem(
        { type: "r", name: "bigquery.user" },
        { type: "r", name: "bigquery.admin" },
      ),
    ).toBe(false);
  });
});

describe("parseSel", () => {
  it("returns an empty array for null or empty input", () => {
    expect(parseSel(null)).toEqual([]);
    expect(parseSel("")).toEqual([]);
  });

  it("parses r: and p: entries separated by commas", () => {
    expect(parseSel("r:bigquery.user,p:bigquery.tables.getData")).toEqual([
      { type: "r", name: "bigquery.user" },
      { type: "p", name: "bigquery.tables.getData" },
    ]);
  });

  it("silently skips entries that don't match the r:/p: pattern", () => {
    expect(parseSel("r:bigquery.user,garbage,x:foo")).toEqual([
      { type: "r", name: "bigquery.user" },
    ]);
  });
});

describe("encodeSel", () => {
  it("joins items back into the comma-separated wire format", () => {
    expect(
      encodeSel([
        { type: "r", name: "bigquery.user" },
        { type: "p", name: "bigquery.tables.getData" },
      ]),
    ).toBe("r:bigquery.user,p:bigquery.tables.getData");
  });

  it("round-trips through parseSel", () => {
    const items: import("./url-state").SelItem[] = [
      { type: "r", name: "storage.admin" },
      { type: "p", name: "iam.serviceAccounts.actAs" },
    ];
    expect(parseSel(encodeSel(items))).toEqual(items);
  });

  it("returns an empty string for an empty list", () => {
    expect(encodeSel([])).toBe("");
  });
});

describe("parseHighlight", () => {
  it("returns null for missing or blank values", () => {
    expect(parseHighlight(null)).toBeNull();
    expect(parseHighlight("")).toBeNull();
    expect(parseHighlight("   ")).toBeNull();
  });

  it("keeps both the permission and the wildcard group form", () => {
    expect(parseHighlight("bigquery.tables.getData")).toBe(
      "bigquery.tables.getData",
    );
    expect(parseHighlight("bigquery.tables.*")).toBe("bigquery.tables.*");
  });

  it("trims surrounding whitespace", () => {
    expect(parseHighlight("  bigquery.tables.*  ")).toBe("bigquery.tables.*");
  });
});

describe("stripWildcard", () => {
  it("drops a trailing .*", () => {
    expect(stripWildcard("bigquery.tables.*")).toBe("bigquery.tables");
  });

  it("leaves other values untouched", () => {
    expect(stripWildcard("bigquery.tables")).toBe("bigquery.tables");
    expect(stripWildcard("bigquery.tables.getData")).toBe(
      "bigquery.tables.getData",
    );
  });
});
