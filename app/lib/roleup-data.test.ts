import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDataset, type RoleupJson } from "./data";

// public/data/roleup.json is ~6MB; read it once via fs rather than import
// so it isn't bundled/transformed by the test runner.
const DATA_PATH = join(import.meta.dirname, "../../public/data/roleup.json");

const json: RoleupJson = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

describe("public/data/roleup.json", () => {
  it("builds a dataset without throwing", () => {
    expect(() => buildDataset(json)).not.toThrow();
  });

  it("has generatedAt in YYYY-MM-DD form", () => {
    expect(json.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("has a plausible number of roles, permissions and services", () => {
    expect(json.roles.length).toBeGreaterThan(2000);
    expect(json.permissions.length).toBeGreaterThan(10000);
    expect(json.services.length).toBeGreaterThan(300);
  });

  it("keeps the basic roles", () => {
    const byName = new Map(json.roles.map((r) => [r.name, r]));
    for (const name of ["roles/owner", "roles/editor", "roles/viewer"]) {
      const role = byName.get(name);
      expect(role, `${name} missing`).toBeDefined();
      expect(role?.kind).toBe("basic");
    }
  });

  it("keeps well-known permissions", () => {
    const perms = new Set(json.permissions);
    expect(perms.has("storage.objects.get")).toBe(true);
    expect(perms.has("resourcemanager.projects.get")).toBe(true);
  });

  it("keeps the bigquery service", () => {
    expect(json.services.some((s) => s.prefix === "bigquery")).toBe(true);
  });

  it("has sorted, in-range permIds for every role", () => {
    // Collect violations and assert once: calling expect() per permId
    // (~200k ids) is slow enough to hit the default test timeout.
    const permCount = json.permissions.length;
    const violations: string[] = [];
    for (const role of json.roles) {
      for (let i = 0; i < role.permIds.length; i++) {
        const id = role.permIds[i];
        if (!(id >= 0 && id < permCount)) {
          violations.push(`${role.name}: permId ${id} out of range`);
        }
        if (i > 0 && !(id > role.permIds[i - 1])) {
          violations.push(
            `${role.name}: permIds not strictly ascending at index ${i}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
