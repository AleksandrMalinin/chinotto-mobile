/**
 * Semantic version comparison (core `major.minor.patch` + optional prerelease).
 * Invalid strings return `null` so callers can fail safe.
 */

export type ParsedSemver = {
  numbers: readonly number[];
  prerelease: readonly string[] | null;
};

const CORE_PART = /^[0-9]+$/;

/** Split `1.2.3-beta.1` into numeric core and prerelease labels. */
export function parseSemver(input: string): ParsedSemver | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }
  const [coreRaw, preRaw] = trimmed.split('-', 2) as [string, string | undefined];
  const coreParts = coreRaw.split('.');
  if (coreParts.length === 0 || coreParts.length > 8) {
    return null;
  }
  const numbers: number[] = [];
  for (const p of coreParts) {
    if (!CORE_PART.test(p)) {
      return null;
    }
    if (p.length > 1 && p.startsWith('0')) {
      return null;
    }
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0) {
      return null;
    }
    numbers.push(n);
  }
  let prerelease: string[] | null = null;
  if (preRaw != null && preRaw.trim() !== '') {
    prerelease = preRaw.split('.').map((s) => s.trim()).filter((s) => s !== '');
    if (prerelease.length === 0) {
      prerelease = null;
    }
  }
  return { numbers, prerelease };
}

function compareNumberArrays(a: readonly number[], b: readonly number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) {
      return -1;
    }
    if (av > bv) {
      return 1;
    }
  }
  return 0;
}

/**
 * Compare prerelease segments per semver: numeric vs string, shorter set is lower if equal prefix.
 */
function comparePrerelease(a: readonly string[] | null, b: readonly string[] | null): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const as = a[i];
    const bs = b[i];
    if (as == null) {
      return bs == null ? 0 : -1;
    }
    if (bs == null) {
      return 1;
    }
    const an = CORE_PART.test(as) ? Number(as) : NaN;
    const bn = CORE_PART.test(bs) ? Number(bs) : NaN;
    const aNum = Number.isFinite(an);
    const bNum = Number.isFinite(bn);
    if (aNum && bNum) {
      if (an < bn) {
        return -1;
      }
      if (an > bn) {
        return 1;
      }
      continue;
    }
    if (aNum !== bNum) {
      return aNum ? -1 : 1;
    }
    if (as < bs) {
      return -1;
    }
    if (as > bs) {
      return 1;
    }
  }
  return 0;
}

/**
 * @returns negative if `a < b`, zero if equal, positive if `a > b`, `null` if either side is invalid.
 */
export function compareSemanticVersions(a: string, b: string): number | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa == null || pb == null) {
    return null;
  }
  const core = compareNumberArrays(pa.numbers, pb.numbers);
  if (core !== 0) {
    return core;
  }
  return comparePrerelease(pa.prerelease, pb.prerelease);
}

/** True when `a` is strictly older than `b`. */
export function isVersionLessThan(a: string, b: string): boolean | null {
  const c = compareSemanticVersions(a, b);
  if (c == null) {
    return null;
  }
  return c < 0;
}
