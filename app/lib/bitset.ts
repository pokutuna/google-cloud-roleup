export function toBitset(permIds: number[], words: number): Uint32Array {
  const bits = new Uint32Array(words);
  for (const id of permIds) {
    bits[id >>> 5] |= 1 << (id & 31);
  }
  return bits;
}

export function hasBit(bits: Uint32Array, id: number): boolean {
  return (bits[id >>> 5] & (1 << (id & 31))) !== 0;
}

export function intersects(a: Uint32Array, b: Uint32Array): boolean {
  for (let i = 0; i < a.length; i++) {
    if ((a[i] & b[i]) !== 0) return true;
  }
  return false;
}

export function intersectionCount(a: Uint32Array, b: Uint32Array): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    let v = a[i] & b[i];
    // popcount
    v -= (v >>> 1) & 0x55555555;
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    count += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  return count;
}
