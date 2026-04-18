export type ParsedScanRow = {
  id: string;
  raw: string;
  name: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
};

const CREDIT_WORDS = ["udhar", "borrowed", "credit", "owe", "owed", "lent", "ادھار", "قرض", "उधार", "ਕਰਜ਼", "ਉਧਾਰ"];
const DEBIT_WORDS = ["paid", "returned", "debit", "settled", "gave", "ادا", "واپس", "भुगतान", "वापस", "ਵਾਪਸ", "ਅਦਾ"];
const NOISE_WORDS = /\b(rs|rupees|pkr|amount|amt|balance|total|page|date|ledger|khata|entry|item)\b/gi;

function detectType(line: string): "credit" | "debit" {
  const lower = line.toLowerCase();
  if (DEBIT_WORDS.some((word) => lower.includes(word.toLowerCase()))) return "debit";
  if (CREDIT_WORDS.some((word) => lower.includes(word.toLowerCase()))) return "credit";
  return /^-/.test(line.trim()) ? "debit" : "credit";
}

function normalizeLine(line: string) {
  return line
    .replace(/[|]/g, " ")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(line: string) {
  return normalizeLine(line)
    .replace(NOISE_WORDS, " ")
    .replace(/[-+]?\d[\d,]*(?:\.\d+)?/g, " ")
    .replace(/[=:;,.()[\]{}]/g, " ")
    .replace(/\b(credit|debit|paid|borrowed|returned|udhar|owe|owed)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmount(line: string) {
  const matches = [...line.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)];
  if (matches.length === 0) return null;

  const ranked = matches
    .map((match) => Number(match[0].replace(/,/g, "").replace(/^\+/, "")))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);

  return ranked[0] ?? null;
}

function splitPotentialRows(text: string) {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const segments: string[] = [];
  for (const line of rawLines) {
    const split = line
      .split(/\s{2,}|(?<=\d)\s+(?=[A-Za-z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F])/g)
      .map((part) => part.trim())
      .filter(Boolean);

    if (split.length > 1) segments.push(...split);
    else segments.push(line);
  }

  return segments;
}

export function parseScannedLedger(text: string): ParsedScanRow[] {
  const lines = splitPotentialRows(text);
  const rows: ParsedScanRow[] = [];

  lines.forEach((line, index) => {
    const amount = extractAmount(line);
    if (!amount) return;

    const name = cleanName(line);
    if (!name || name.length < 2) return;

    rows.push({
      id: `scan-row-${index}`,
      raw: line,
      name,
      amount,
      type: detectType(line),
      description: line,
    });
  });

  const unique = new Map<string, ParsedScanRow>();
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.amount}|${row.type}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  return [...unique.values()];
}
