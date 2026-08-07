import { describe, expect, it } from "vitest";
import { buildFixtureDataset } from "../lib/test/fixture";
import {
  allResourceKeys,
  buildRows,
  findHighlightRow,
} from "./perm-group-list-utils";

const ds = buildFixtureDataset();
// all permission ids in name-sorted (id) order, as the real caller supplies
const allPermIds = ds.permissions.map((_, i) => i);

describe("buildRows", () => {
  it("groups a contiguous run under one group row, followed by its flat rows", () => {
    // bigquery.datasets.{get,setIamPolicy} share group "bigquery.datasets"
    const rows = buildRows(ds, [0, 1], new Set());
    expect(rows).toEqual([
      {
        type: "group",
        key: "bigquery.datasets",
        permIds: [0, 1],
        collapsed: false,
      },
      { type: "flat", id: 0, name: "bigquery.datasets.get" },
      { type: "flat", id: 1, name: "bigquery.datasets.setIamPolicy" },
    ]);
  });

  it("starts a new group row when the resource group changes", () => {
    // ids 0,1 -> bigquery.datasets; ids 2,3,4 -> bigquery.tables
    const rows = buildRows(ds, [0, 1, 2, 3, 4], new Set());
    const groupRows = rows.filter((r) => r.type === "group");
    expect(groupRows.map((r) => r.key)).toEqual([
      "bigquery.datasets",
      "bigquery.tables",
    ]);
  });

  it("emits only the group placeholder row when the group is collapsed", () => {
    const rows = buildRows(ds, [0, 1], new Set(["bigquery.datasets"]));
    expect(rows).toEqual([
      {
        type: "group",
        key: "bigquery.datasets",
        permIds: [0, 1],
        collapsed: true,
      },
    ]);
  });

  it("uses the service alone as the group key when there is no resource segment", () => {
    // id 5 = "browser.get": 2 segments, resource is "", so group falls back to service
    const rows = buildRows(ds, [5], new Set());
    expect(rows[0]).toEqual({
      type: "group",
      key: "browser",
      permIds: [5],
      collapsed: false,
    });
  });

  it("produces one group per resource/service across the whole fixture", () => {
    const rows = buildRows(ds, allPermIds, new Set());
    const groupKeys = rows.filter((r) => r.type === "group").map((r) => r.key);
    expect(groupKeys).toEqual([
      "bigquery.datasets",
      "bigquery.tables",
      "browser",
      "iam.serviceAccounts",
      "storage.objects",
    ]);
  });
});

describe("allResourceKeys", () => {
  it("returns every distinct group key across the given permIds", () => {
    expect(new Set(allResourceKeys(ds, allPermIds))).toEqual(
      new Set([
        "bigquery.datasets",
        "bigquery.tables",
        "browser",
        "iam.serviceAccounts",
        "storage.objects",
      ]),
    );
  });

  it("returns an empty array for an empty permIds list", () => {
    expect(allResourceKeys(ds, [])).toEqual([]);
  });
});

describe("findHighlightRow", () => {
  it("finds the flat row of an exact permission", () => {
    const rows = buildRows(ds, [0, 1, 2, 3, 4], new Set());
    // [group bigquery.datasets, 0, 1, group bigquery.tables, 2, 3, 4]
    expect(findHighlightRow(rows, 3, "bigquery.tables")).toBe(5);
  });

  it("falls back to the group row when the group is collapsed", () => {
    const rows = buildRows(ds, [0, 1, 2, 3, 4], new Set(["bigquery.tables"]));
    // [group bigquery.datasets, 0, 1, group bigquery.tables]
    expect(findHighlightRow(rows, 3, "bigquery.tables")).toBe(3);
  });

  it("finds the group row for a group-only target", () => {
    const rows = buildRows(ds, [0, 1, 2, 3, 4], new Set());
    expect(findHighlightRow(rows, undefined, "bigquery.tables")).toBe(3);
  });

  it("returns -1 when the target is not in the list at all", () => {
    const rows = buildRows(ds, [0, 1], new Set());
    expect(findHighlightRow(rows, 8, "storage.objects")).toBe(-1);
    expect(findHighlightRow(rows, undefined, "storage.objects")).toBe(-1);
  });
});
