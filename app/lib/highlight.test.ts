import { describe, expect, it } from "vitest";
import {
  isGroupHighlighted,
  isPermHighlighted,
  permHighlightStrength,
  resolveHighlight,
} from "./highlight";
import { buildFixtureDataset } from "./test/fixture";

const ds = buildFixtureDataset();

describe("resolveHighlight", () => {
  it("returns null for an empty target", () => {
    expect(resolveHighlight(ds, null)).toBeNull();
    expect(resolveHighlight(ds, "")).toBeNull();
  });

  it("resolves an exact permission name, carrying its group", () => {
    expect(resolveHighlight(ds, "bigquery.tables.getData")).toEqual({
      raw: "bigquery.tables.getData",
      permId: 3,
      groupKey: "bigquery.tables",
    });
  });

  it("resolves a group with an explicit wildcard", () => {
    expect(resolveHighlight(ds, "bigquery.tables.*")).toEqual({
      raw: "bigquery.tables.*",
      groupKey: "bigquery.tables",
    });
  });

  it("resolves a bare group name without the wildcard", () => {
    expect(resolveHighlight(ds, "storage.objects")).toEqual({
      raw: "storage.objects",
      groupKey: "storage.objects",
    });
  });

  it("resolves a prefix-less permission, whose group is the service", () => {
    expect(resolveHighlight(ds, "browser.get")).toEqual({
      raw: "browser.get",
      permId: 5,
      groupKey: "browser",
    });
  });

  it("returns null when the target matches neither a permission nor a group", () => {
    expect(resolveHighlight(ds, "nosuch.thing.here")).toBeNull();
    expect(resolveHighlight(ds, "nosuch.thing.*")).toBeNull();
  });
});

describe("isPermHighlighted", () => {
  it("matches only the exact permission for a permission target", () => {
    const hl = resolveHighlight(ds, "bigquery.tables.getData");
    expect(isPermHighlighted(ds, hl, 3)).toBe(true);
    expect(isPermHighlighted(ds, hl, 4)).toBe(false);
  });

  it("matches every permission in the group for a group target", () => {
    const hl = resolveHighlight(ds, "bigquery.tables.*");
    // 2,3,4 are the bigquery.tables permissions in the fixture
    expect([2, 3, 4].map((id) => isPermHighlighted(ds, hl, id))).toEqual([
      true,
      true,
      true,
    ]);
    // bigquery.datasets.get is a different group
    expect(isPermHighlighted(ds, hl, 0)).toBe(false);
  });

  it("is false when there is no highlight", () => {
    expect(isPermHighlighted(ds, null, 3)).toBe(false);
  });
});

describe("isGroupHighlighted", () => {
  it("tints the header for a group target", () => {
    const hl = resolveHighlight(ds, "bigquery.tables.*");
    expect(isGroupHighlighted(hl, "bigquery.tables")).toBe(true);
    expect(isGroupHighlighted(hl, "bigquery.datasets")).toBe(false);
  });

  it("leaves the header alone for a permission target", () => {
    // the group is still unfolded to reveal the row, but only that row tints
    const hl = resolveHighlight(ds, "bigquery.tables.getData");
    expect(hl?.groupKey).toBe("bigquery.tables");
    expect(isGroupHighlighted(hl, "bigquery.tables")).toBe(false);
  });

  it("is false without a highlight", () => {
    expect(isGroupHighlighted(null, "bigquery.tables")).toBe(false);
    expect(isGroupHighlighted(undefined, "bigquery.tables")).toBe(false);
  });
});

describe("permHighlightStrength", () => {
  it("marks a named permission strong and leaves its siblings alone", () => {
    const hl = resolveHighlight(ds, "bigquery.tables.getData");
    // 3 is getData; 2 and 4 share the group but were not the target
    expect(permHighlightStrength(ds, hl, 3)).toBe("strong");
    expect(permHighlightStrength(ds, hl, 2)).toBe("none");
    expect(permHighlightStrength(ds, hl, 4)).toBe("none");
  });

  it("marks every member of a group target weak, so the header carries it", () => {
    const hl = resolveHighlight(ds, "bigquery.tables.*");
    expect(permHighlightStrength(ds, hl, 2)).toBe("weak");
    expect(permHighlightStrength(ds, hl, 3)).toBe("weak");
    expect(permHighlightStrength(ds, hl, 4)).toBe("weak");
    expect(permHighlightStrength(ds, hl, 0)).toBe("none");
  });

  it("is none without a highlight", () => {
    expect(permHighlightStrength(ds, null, 3)).toBe("none");
    expect(permHighlightStrength(ds, undefined, 3)).toBe("none");
  });
});
