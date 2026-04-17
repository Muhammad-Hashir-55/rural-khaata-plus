// Best-effort multilingual parser for spoken transactions.
// Extracts: { name, amount, type } from a free-form phrase.
// Examples handled:
//   "Ali borrowed 500 rupees"            -> credit, Ali, 500
//   "I owe Sara 200"                     -> debit, Sara, 200
//   "علی نے 500 روپے ادھار لیے"           -> credit, علی, 500
//   "अली ने 500 रुपये लिए"                -> credit, अली, 500
//   "ਅਲੀ ਨੇ 500 ਰੁਪਏ ਲਏ"                  -> credit, ਅਲੀ, 500

export type ParsedVoice = {
  name?: string;
  amount?: number;
  type?: "credit" | "debit";
  raw: string;
};

const DEBIT_HINTS = [
  // English
  "i owe", "owe him", "owe her", "owe them", "paid to", "gave to", "i gave", "returned to",
  // Urdu
  "میں نے دیے", "میں نے دیا", "ادا کیے", "واپس کیے",
  // Hindi
  "मैंने दिए", "मैंने दिया", "वापस किए",
  // Punjabi
  "ਮੈਂ ਦਿੱਤੇ", "ਮੈਂ ਦਿੱਤਾ",
];

const CREDIT_HINTS = [
  "borrowed", "took", "owes me", "owes", "lent to", "credit", "udhar", "udhaar",
  "ادھار", "قرض", "لیے", "لیا",
  "उधार", "लिए", "लिया", "कर्ज़",
  "ਉਧਾਰ", "ਲਏ", "ਲਿਆ",
];

// Convert Urdu/Hindi/Punjabi numerals to ASCII
function normalizeDigits(s: string) {
  const map: Record<string, string> = {
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
    "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9",
    "੦":"0","੧":"1","੨":"2","੩":"3","੪":"4","੫":"5","੬":"6","੭":"7","੮":"8","੯":"9",
  };
  return s.replace(/[۰-۹٠-٩०-९੦-੯]/g, (c) => map[c] ?? c);
}

const NUMBER_WORDS_EN: Record<string, number> = {
  hundred: 100, thousand: 1000, lakh: 100000, lac: 100000, crore: 10000000,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function parseNumberWords(text: string): number | undefined {
  const tokens = text.toLowerCase().split(/\s+/);
  let total = 0, current = 0, found = false;
  for (const tok of tokens) {
    const n = NUMBER_WORDS_EN[tok];
    if (n === undefined) continue;
    found = true;
    if (n >= 100) {
      current = (current || 1) * n;
      if (n >= 1000) { total += current; current = 0; }
    } else current += n;
  }
  return found ? total + current : undefined;
}

export function parseVoiceTransaction(raw: string): ParsedVoice {
  const text = normalizeDigits(raw.trim());
  const lower = text.toLowerCase();

  // Type
  let type: "credit" | "debit" | undefined;
  if (DEBIT_HINTS.some((h) => lower.includes(h.toLowerCase()))) type = "debit";
  else if (CREDIT_HINTS.some((h) => lower.includes(h.toLowerCase()))) type = "credit";

  // Amount: digits first
  let amount: number | undefined;
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (m) amount = parseFloat(m[1].replace(",", ""));
  if (amount === undefined) amount = parseNumberWords(lower);

  // Name: first capitalized token, or token before "ne"/"nay"/"borrowed"/"took"
  let name: string | undefined;
  // Try pattern "X borrowed/took/owes ..."
  const nameMatch =
    text.match(/^([\p{L}]+(?:\s[\p{L}]+)?)\s+(?:borrowed|took|owes|ne|نے|ने|ਨੇ)/iu) ||
    text.match(/(?:to|for|سے|से|ਨੂੰ|को)\s+([\p{L}]+(?:\s[\p{L}]+)?)/iu) ||
    text.match(/^([\p{L}]+)/u);
  if (nameMatch) name = nameMatch[1].trim();

  return { name, amount, type, raw: text };
}
