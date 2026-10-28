export type ParsedRow = Record<string, unknown>;
export async function sha256(file: File) {
 const bytes = await file.arrayBuffer();
 const hash = await crypto.subtle.digest("SHA-256", bytes);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
export function cleanValue(value: unknown): unknown {
 if (value instanceof Date) return value.toISOString();
 if (typeof value === "bigint") return value.toString();
 if (value === undefined) return null;
 if (Array.isArray(value)) return value.map(cleanValue);
 if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,cleanValue(v)]));
 return value;
}
export function respondentCode(row: ParsedRow, index: number) {
 const candidates = Object.entries(row).filter(([key])=>/respondent|participant|response\s*id|serial|sl\.?\s*no/i.test(key));
 const raw = candidates.map(([,v])=>String(v ?? "").trim()).find(Boolean);
 return raw ? raw.slice(0,80) : `SOURCE-ROW-${index+2}`;
}