import { describe, expect, it } from "vitest";
import { isKeyOpen, toggledCollapsed } from "./compare-pane-utils";

const none = new Set<string>();

describe("isKeyOpen", () => {
  it("follows defaultOpen when the key is untouched", () => {
    expect(isKeyOpen(none, none, "g", true)).toBe(true);
    expect(isKeyOpen(none, none, "g", false)).toBe(false);
  });

  it("inverts defaultOpen for keys in collapsed", () => {
    const collapsed = new Set(["g"]);
    expect(isKeyOpen(collapsed, none, "g", true)).toBe(false);
    expect(isKeyOpen(collapsed, none, "g", false)).toBe(true);
  });

  it("forceOpen wins over collapsed", () => {
    expect(isKeyOpen(new Set(["g"]), new Set(["g"]), "g", true)).toBe(true);
  });
});

describe("toggledCollapsed", () => {
  it("closes an open group in a large comparison in one step", () => {
    // defaultOpen=false, so the group was open only via forceOpen (?hl=);
    // membership must be dropped, not added, or it would stay open
    const next = toggledCollapsed(none, "g", true, false);
    expect(isKeyOpen(next, none, "g", false)).toBe(false);
  });

  it("closes an open group in a small comparison in one step", () => {
    const next = toggledCollapsed(none, "g", true, true);
    expect(isKeyOpen(next, none, "g", true)).toBe(false);
  });

  it("reopens a closed group in one step", () => {
    for (const defaultOpen of [true, false]) {
      const closed = toggledCollapsed(none, "g", true, defaultOpen);
      const reopened = toggledCollapsed(closed, "g", false, defaultOpen);
      expect(isKeyOpen(reopened, none, "g", defaultOpen)).toBe(true);
    }
  });

  it("leaves other keys alone", () => {
    const next = toggledCollapsed(new Set(["other"]), "g", true, true);
    expect(next.has("other")).toBe(true);
  });
});
