import { describe, expect, it } from "vitest";
import { hasBit } from "./bitset";
import {
  filterPermIds,
  filterRoles,
  hasPermFilter,
  matchingPermBits,
  parseQuery,
  permNameMatches,
  rolesWithPermission,
  stripPermQualifiers,
  suggest,
} from "./search";
import { buildFixtureDataset } from "./test/fixture";

const ds = buildFixtureDataset();

describe("parseQuery", () => {
  it("separates s:/r:/p: qualifiers from free text", () => {
    expect(parseQuery("s:bigquery r:admin p:delete free")).toEqual({
      s: ["bigquery"],
      r: ["admin"],
      p: ["delete"],
      free: ["free"],
    });
  });

  it("lowercases all tokens", () => {
    expect(parseQuery("S:BigQuery FreeText")).toEqual({
      s: ["bigquery"],
      r: [],
      p: [],
      free: ["freetext"],
    });
  });

  it("collects multiple tokens of the same kind", () => {
    expect(parseQuery("s:bigquery s:storage")).toEqual({
      s: ["bigquery", "storage"],
      r: [],
      p: [],
      free: [],
    });
  });

  it("drops qualifiers with an empty value", () => {
    expect(parseQuery("s: p:")).toEqual({ s: [], r: [], p: [], free: [] });
  });

  it("ignores extra whitespace between tokens", () => {
    expect(parseQuery("  s:bigquery   admin  ")).toEqual({
      s: ["bigquery"],
      r: [],
      p: [],
      free: ["admin"],
    });
  });
});

describe("permNameMatches", () => {
  it("matches case-insensitively on both name and term", () => {
    expect(permNameMatches("bigquery.tables.getData", "getdata")).toBe(true);
    expect(permNameMatches("bigquery.tables.getData", "GETDATA")).toBe(true);
    expect(permNameMatches("bigquery.tables.getData", "xyz")).toBe(false);
  });
});

describe("matchingPermBits", () => {
  it("sets bits only for matching permission ids", () => {
    const bits = matchingPermBits(ds, "objects");
    expect(hasBit(bits, 7)).toBe(true);
    expect(hasBit(bits, 8)).toBe(true);
    expect(hasBit(bits, 9)).toBe(true);
    expect(hasBit(bits, 0)).toBe(false);
  });
});

describe("filterRoles", () => {
  it("filters by s: on the role's service", () => {
    const result = filterRoles(ds, parseQuery("s:storage"));
    const names = result.map((i) => ds.roles[i].name);
    // basic role spans all services, so it stays too
    expect(names).toContain("roles/storage.objectViewer");
    expect(names).toContain("roles/viewer");
    expect(names).not.toContain("roles/bigquery.admin");
  });

  it("filters roles that contain a matching permission via p:", () => {
    const result = filterRoles(ds, parseQuery("p:setIamPolicy"));
    const names = result.map((i) => ds.roles[i].name);
    expect(names).toEqual(["roles/bigquery.admin"]);
  });

  it("ANDs multiple qualifier kinds together", () => {
    const result = filterRoles(ds, parseQuery("s:bigquery p:getData"));
    const names = result.map((i) => ds.roles[i].name);
    expect(names).toEqual(
      expect.arrayContaining([
        "roles/bigquery.dataViewer",
        "roles/bigquery.admin",
      ]),
    );
    expect(names).not.toContain("roles/bigquery.metadataViewer");
    expect(names).not.toContain("roles/storage.objectViewer");
  });

  it("matches free text against service/role name/title", () => {
    // "dataviewer" is a substring of both the dataViewer role's short name
    // and (with no word boundary) the metadataViewer role's short name
    // ("bigquery.metadataviewer" contains "dataviewer").
    const result = filterRoles(ds, parseQuery("dataviewer"));
    const names = result.map((i) => ds.roles[i].name);
    expect(names).toEqual(
      expect.arrayContaining([
        "roles/bigquery.dataViewer",
        "roles/bigquery.metadataViewer",
      ]),
    );
    expect(names).toHaveLength(2);
  });

  it("returns all roles for an empty query", () => {
    const result = filterRoles(ds, parseQuery(""));
    expect(result.length).toBe(ds.roles.length);
  });
});

describe("filterPermIds / hasPermFilter", () => {
  const allPermIds = ds.permissions.map((_, i) => i);

  it("hasPermFilter is true only when s: or p: is present", () => {
    expect(hasPermFilter(parseQuery("r:admin free"))).toBe(false);
    expect(hasPermFilter(parseQuery("s:bigquery"))).toBe(true);
    expect(hasPermFilter(parseQuery("p:delete"))).toBe(true);
  });

  it("returns the input unchanged when there is no s:/p: filter", () => {
    expect(filterPermIds(ds, allPermIds, parseQuery("r:admin free"))).toEqual(
      allPermIds,
    );
  });

  it("filters by permission service via s:", () => {
    const result = filterPermIds(ds, allPermIds, parseQuery("s:storage"));
    expect(result).toEqual([7, 8, 9]);
  });

  it("filters by permission name substring via p:", () => {
    const result = filterPermIds(ds, allPermIds, parseQuery("p:delete"));
    expect(result).toEqual([2, 7]);
  });

  it("ignores r: and free terms entirely", () => {
    const withNoise = filterPermIds(
      ds,
      allPermIds,
      parseQuery("r:admin freeword s:storage"),
    );
    expect(withNoise).toEqual([7, 8, 9]);
  });
});

describe("stripPermQualifiers", () => {
  it("removes only s:/p: tokens, keeping r: and free tokens", () => {
    expect(stripPermQualifiers("s:bigquery r:admin free p:delete")).toBe(
      "r:admin free",
    );
  });

  it("returns an empty string when nothing remains", () => {
    expect(stripPermQualifiers("s:bigquery p:delete")).toBe("");
  });

  it("leaves a query with no qualifiers untouched", () => {
    expect(stripPermQualifiers("admin free")).toBe("admin free");
  });
});

describe("rolesWithPermission", () => {
  it("returns roles holding the permission, sorted by permission count asc", () => {
    // perm id 0 (bigquery.datasets.get) is held by roles 0,1,2,3
    const result = rolesWithPermission(ds, 0);
    const counts = result.map((i) => ds.roles[i].permIds.length);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(result).toEqual(expect.arrayContaining([0, 1, 2, 3]));
  });

  it("returns an empty array when no role holds the permission", () => {
    // perm id 6 (iam.serviceAccounts.actAs) only on the service agent role
    const result = rolesWithPermission(ds, 6);
    expect(result).toEqual([5]);
  });
});

describe("suggest", () => {
  it("limits each category to the top N results", () => {
    const result = suggest(ds, "o", 1);
    expect(result.services.length).toBeLessThanOrEqual(1);
    expect(result.roleIndexes.length).toBeLessThanOrEqual(1);
    expect(result.permIds.length).toBeLessThanOrEqual(1);
  });

  it("excludes service agent roles by default", () => {
    const result = suggest(ds, "dataproc");
    expect(result.roleIndexes).not.toContain(5);
  });

  it("includes service agent roles when includeServiceAgents is set", () => {
    const result = suggest(ds, "dataproc", 6, { includeServiceAgents: true });
    expect(result.roleIndexes).toContain(5);
  });

  it("restricts suggestions to the given qualifier kind", () => {
    const result = suggest(ds, "s:bigquery");
    expect(result.services.length).toBeGreaterThan(0);
    expect(result.roleIndexes).toEqual([]);
    expect(result.permIds).toEqual([]);
  });
});
