import { RAW } from "./words-data.js";

/** Parse lines into {id, w, d} */
export function parseWords(raw) {
  const out = [];
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s*(.+?)\s*[-:]\s*(.+)$/);
    if (m) { out.push({ id: Number(m[1]), w: m[2].trim(), d: m[3].trim() }); continue; }
    const m2 = line.match(/^(\d+)\.\s*(.+)$/);
    if (m2) out.push({ id: Number(m2[1]), w: m2[2].trim(), d: "" });
  }
  out.sort((a,b)=>a.id-b.id);
  return out;
}

export const WORDS = parseWords(RAW);
