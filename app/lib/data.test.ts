import { describe, expect, it } from "vitest";
import {
  isServiceAgent,
  permParts,
  roleServicePrefix,
  shortRoleName,
} from "./data";
import { buildFixtureDataset, FIXTURE_JSON } from "./test/fixture";

describe("shortRoleName", () => {
  it("strips the roles/ prefix", () => {
    expect(shortRoleName("roles/bigquery.user")).toBe("bigquery.user");
  });

  it("leaves names without the prefix untouched", () => {
    expect(shortRoleName("bigquery.user")).toBe("bigquery.user");
  });
});

describe("roleServicePrefix", () => {
  it("returns the first segment when the short name has a dot", () => {
    expect(roleServicePrefix("roles/bigquery.user")).toBe("bigquery");
  });

  it("returns null when the short name has no dot", () => {
    expect(roleServicePrefix("roles/browser")).toBe(null);
  });
});

describe("permParts", () => {
  it("splits a 3-segment permission into service/resource/verb", () => {
    expect(permParts("bigquery.tables.getData")).toEqual({
      service: "bigquery",
      resource: "tables",
      verb: "getData",
      group: "bigquery.tables",
    });
  });

  it("treats a 2-segment permission as service + verb with empty resource", () => {
    expect(permParts("resourcemanager.get")).toEqual({
      service: "resourcemanager",
      resource: "",
      verb: "get",
      group: "resourcemanager",
    });
  });

  it("joins middle segments for 4+ segment permissions", () => {
    expect(permParts("a.b.c.d")).toEqual({
      service: "a",
      resource: "b.c",
      verb: "d",
      group: "a.b.c",
    });
  });

  it("treats a bare, dot-less permission as service-only with empty verb/resource", () => {
    // current implementation: segs.length === 1 -> verb: "", resource: "",
    // group: "" (segs.slice(0, -1) of a 1-element array is empty)
    expect(permParts("browser")).toEqual({
      service: "browser",
      resource: "",
      verb: "",
      group: "",
    });
  });
});

describe("isServiceAgent", () => {
  it("detects service agent roles by name suffix", () => {
    const ds = buildFixtureDataset();
    const role =
      ds.roles[ds.roleIndexByName.get("roles/dataproc.serviceAgent") as number];
    expect(isServiceAgent(role)).toBe(true);
  });

  it("returns false for ordinary predefined roles", () => {
    const ds = buildFixtureDataset();
    const role =
      ds.roles[ds.roleIndexByName.get("roles/bigquery.admin") as number];
    expect(isServiceAgent(role)).toBe(false);
  });
});

describe("buildDataset", () => {
  const ds = buildFixtureDataset();

  it("indexes roles by name", () => {
    expect(ds.roleIndexByName.get("roles/viewer")).toBe(0);
    expect(ds.roleIndexByName.get("roles/bigquery.admin")).toBe(3);
    expect(ds.roleIndexByName.get("roles/does-not-exist")).toBeUndefined();
  });

  it("indexes permission ids by name", () => {
    expect(ds.permIdByName.get("bigquery.datasets.get")).toBe(0);
    expect(ds.permIdByName.get("storage.objects.list")).toBe(9);
  });

  it("maps service prefixes to display names", () => {
    expect(ds.serviceNameByPrefix.get("bigquery")).toBe("BigQuery");
    expect(ds.serviceNameByPrefix.get("storage")).toBe("Cloud Storage");
  });

  it("builds one bitset per role aligned with roles[]", () => {
    expect(ds.roleBits.length).toBe(FIXTURE_JSON.roles.length);
    expect(ds.bitsetWords).toBe(
      Math.ceil(FIXTURE_JSON.permissions.length / 32),
    );
    // roles/bigquery.metadataViewer holds perm ids 0 and 4
    const bits = ds.roleBits[2];
    expect((bits[0] & (1 << 0)) !== 0).toBe(true);
    expect((bits[0] & (1 << 4)) !== 0).toBe(true);
    expect((bits[0] & (1 << 3)) !== 0).toBe(false);
  });
});
