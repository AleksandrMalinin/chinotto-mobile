/**
 * Linear RGBA blend for adaptive chrome (normal dark ↔ sunlight).
 * Keeps transitions smooth without remounting; callers throttle frame updates.
 */

type Rgba = { r: number; g: number; b: number; a: number };

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function hexToRgba(hex: string): Rgba | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return null;
    }
    return { r, g, b, a: 1 };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return null;
    }
    return { r, g, b, a: 1 };
  }
  return null;
}

function cssRgbaToRgba(s: string): Rgba | null {
  const m = s.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i,
  );
  if (!m) {
    return null;
  }
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if ([r, g, b, a].some((n) => Number.isNaN(n))) {
    return null;
  }
  return { r, g, b, a };
}

function parseToRgba(s: string): Rgba | null {
  const t = s.trim();
  if (t.startsWith('#')) {
    return hexToRgba(t);
  }
  return cssRgbaToRgba(t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function formatColor(c: Rgba): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  const a = c.a;
  if (a >= 0.999) {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  const af = Math.round(a * 1000) / 1000;
  return `rgba(${r},${g},${b},${af})`;
}

export function blendColorPair(from: string, to: string, tRaw: number): string {
  const t = clamp01(tRaw);
  if (t <= 0) {
    return from;
  }
  if (t >= 1) {
    return to;
  }
  const a = parseToRgba(from);
  const b = parseToRgba(to);
  if (!a || !b) {
    return t < 0.5 ? from : to;
  }
  return formatColor({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a, b.a, t),
  });
}
