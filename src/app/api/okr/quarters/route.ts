import { NextResponse } from "next/server";

function parseQuarterKey(key: string): { q: number; year: number } | null {
  const match = key.match(/^Q(\d)_(\d{4})$/);
  if (!match) return null;
  return { q: parseInt(match[1], 10), year: parseInt(match[2], 10) };
}

function shiftQuarter(base: { q: number; year: number }, offset: number): { q: number; year: number } {
  let q = base.q - 1 + offset; // 0-indexed
  let year = base.year;
  while (q < 0) { q += 4; year--; }
  while (q >= 4) { q -= 4; year++; }
  return { q: q + 1, year };
}

function toEnvKey({ q, year }: { q: number; year: number }): string {
  return `Q${q}_${year}`;
}

function toLabel({ q, year }: { q: number; year: number }, tag: string): string {
  return `Q${q} ${year}${tag ? ` (${tag})` : ""}`;
}

export async function GET() {
  const currentKey = process.env.OKR_CURRENT_QUARTER;
  if (!currentKey) {
    return NextResponse.json({ quarters: [], currentQuarter: null });
  }

  const current = parseQuarterKey(currentKey);
  if (!current) {
    return NextResponse.json({ quarters: [], currentQuarter: null });
  }

  const candidates = [
    { offset: -1, tag: "Previous" },
    { offset: 0, tag: "Current" },
    { offset: 1, tag: "Next" },
  ];

  const quarters = candidates
    .map(({ offset, tag }) => {
      const parsed = shiftQuarter(current, offset);
      const envKey = toEnvKey(parsed);
      const docId = process.env[`OKR_DOC_${envKey}`];
      if (!docId) return null;
      return { value: envKey, label: toLabel(parsed, tag) };
    })
    .filter(Boolean);

  return NextResponse.json({ quarters, currentQuarter: currentKey });
}
