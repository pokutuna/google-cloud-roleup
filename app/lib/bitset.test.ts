import { describe, expect, it } from "vitest";
import { hasBit, intersectionCount, intersects, toBitset } from "./bitset";

describe("toBitset / hasBit", () => {
  it("sets bits for the given ids", () => {
    const bits = toBitset([0, 5, 31, 32, 63], 3);
    expect(hasBit(bits, 0)).toBe(true);
    expect(hasBit(bits, 5)).toBe(true);
    expect(hasBit(bits, 31)).toBe(true);
    expect(hasBit(bits, 32)).toBe(true);
    expect(hasBit(bits, 63)).toBe(true);
    expect(hasBit(bits, 1)).toBe(false);
    expect(hasBit(bits, 30)).toBe(false);
    expect(hasBit(bits, 33)).toBe(false);
    expect(hasBit(bits, 62)).toBe(false);
  });

  it("produces the requested number of words, zero-filled otherwise", () => {
    const bits = toBitset([], 4);
    expect(bits.length).toBe(4);
    expect([...bits].every((w) => w === 0)).toBe(true);
  });

  it("places id 31 and id 32 in adjacent words (word boundary)", () => {
    const bits = toBitset([31, 32], 2);
    // Uint32Array stores the unsigned value; (1 << 31) is a signed -2147483648
    // in plain JS numbers, so compare against the unsigned equivalent.
    expect(bits[0]).toBe((1 << 31) >>> 0);
    expect(bits[1]).toBe(1);
  });
});

describe("intersects", () => {
  it("is true when any word overlaps, including across a word boundary", () => {
    const a = toBitset([32], 2);
    const b = toBitset([32], 2);
    expect(intersects(a, b)).toBe(true);
  });

  it("is false when there is no overlap", () => {
    const a = toBitset([0, 31], 2);
    const b = toBitset([1, 32], 2);
    expect(intersects(a, b)).toBe(false);
  });

  it("is false for two empty bitsets", () => {
    const a = toBitset([], 2);
    const b = toBitset([], 2);
    expect(intersects(a, b)).toBe(false);
  });
});

describe("intersectionCount", () => {
  it("counts shared bits within a single word", () => {
    const a = toBitset([0, 1, 2, 31], 2);
    const b = toBitset([0, 2, 31], 2);
    expect(intersectionCount(a, b)).toBe(3);
  });

  it("counts shared bits across a word boundary (31/32/63)", () => {
    const a = toBitset([31, 32, 63], 2);
    const b = toBitset([31, 32, 63], 2);
    expect(intersectionCount(a, b)).toBe(3);
  });

  it("is 0 when there is no overlap", () => {
    const a = toBitset([0], 1);
    const b = toBitset([1], 1);
    expect(intersectionCount(a, b)).toBe(0);
  });
});
