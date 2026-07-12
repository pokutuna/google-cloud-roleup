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
    const permCount = json.permissions.length;
    for (const role of json.roles) {
      for (let i = 0; i < role.permIds.length; i++) {
        const id = role.permIds[i];
        expect(
          id >= 0 && id < permCount,
          `${role.name}: permId ${id} out of range`,
        ).toBe(true);
        if (i > 0) {
          expect(
            role.permIds[i] > role.permIds[i - 1],
            `${role.name}: permIds not strictly ascending at index ${i}`,
          ).toBe(true);
        }
      }
    }
  });
});
