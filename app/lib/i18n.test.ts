import { describe, expect, it } from "vitest";
import { getMessage } from "./i18n-data";

describe("getMessage", () => {
  it("returns the ja message for lang ja", () => {
    expect(getMessage("ja", "header.settings")).toBe("設定");
  });

  it("returns the en message for lang en", () => {
    expect(getMessage("en", "header.settings")).toBe("Settings");
  });

  it("substitutes {n}-style placeholders from params", () => {
    expect(getMessage("en", "rolelist.count", { count: 3 })).toBe("3 roles");
    expect(getMessage("ja", "rolelist.maxCompare", { n: 5 })).toBe(
      "比較は最大 5 ロールまで",
    );
  });

  it("substitutes multiple distinct placeholders", () => {
    expect(
      getMessage("en", "header.dataStats", {
        date: "2026-01-01",
        roles: 10,
        perms: 20,
      }),
    ).toBe("data: 2026-01-01 · 10 roles · 20 permissions");
  });

  it("leaves a placeholder untouched when its param is missing", () => {
    expect(getMessage("en", "rolelist.count", {})).toBe("{count} roles");
    expect(getMessage("en", "rolelist.count")).toBe("{count} roles");
  });
});
