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
const NAME_CHARS = /[A-Za-z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]/;
const AMOUNT_TOKEN_REGEX = /[-+]?\s*\d[\d,]*(?:\.\d+)?/g;

function detectType(line: string, explicitSign?: string): "credit" | "debit" {
  const lower = line.toLowerCase();
  if (DEBIT_WORDS.some((word) => lower.includes(word.toLowerCase()))) return "debit";
  if (CREDIT_WORDS.some((word) => lower.includes(word.toLowerCase()))) return "credit";
  if (explicitSign?.startsWith("-")) return "debit";
  if (explicitSign?.startsWith("+")) return "credit";
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
    .replace(/[=:;,.()[\]{}_\\/]/g, " ")
    .replace(/\b(credit|debit|paid|borrowed|returned|udhar|owe|owed)\b/gi, " ")
    .replace(/^[-_~.\s]+|[-_~.\s]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmounts(line: string) {
  return [...line.matchAll(AMOUNT_TOKEN_REGEX)]
    .map((match) => {
      const token = match[0].replace(/\s+/g, "");
      const value = Number(token.replace(/,/g, "").replace(/^\+/, ""));
      if (!Number.isFinite(value) || value === 0) return null;
      return {
        amount: Math.abs(value),
        sign: token.startsWith("-") ? "-" : token.startsWith("+") ? "+" : "",
      };
    })
    .filter((entry): entry is { amount: number; sign: string } => !!entry);
}

function isLikelyName(value: string) {
  if (!value) return false;
  if (!NAME_CHARS.test(value)) return false;
  const letters = value.match(/[A-Za-z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]/g)?.length ?? 0;
  return letters >= 2;
}

function isStrongInlineNameCandidate(value: string, hasAmount: boolean) {
  if (!isLikelyName(value)) return false;
  if (!hasAmount) return true;

  const tokens = value.split(/\s+/).filter(Boolean);
  const letters = value.match(/[A-Za-z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]/g)?.length ?? 0;
  if (tokens.length > 4) return false;
  return letters >= 3;
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
  let currentName: string | null = null;

  lines.forEach((line, index) => {
    const normalized = normalizeLine(line);
    const nameOnLine = cleanName(normalized);
    const amountEntries = extractAmounts(normalized);
    const hasAmount = amountEntries.length > 0;
    const strongNameOnLine = isStrongInlineNameCandidate(nameOnLine, hasAmount);

    if (!hasAmount && strongNameOnLine) {
      currentName = nameOnLine;
    }

    if (!hasAmount) return;

    const effectiveName = strongNameOnLine ? nameOnLine : currentName;
    if (!effectiveName) return;

    amountEntries.forEach((entry, amountIndex) => {
      rows.push({
        id: `scan-row-${index}-${amountIndex}`,
        raw: normalized,
        name: effectiveName,
        amount: entry.amount,
        type: detectType(normalized, entry.sign),
        description: normalized,
      });
    });
  });

  const unique = new Map<string, ParsedScanRow>();
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.amount}|${row.type}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  return [...unique.values()];
}
