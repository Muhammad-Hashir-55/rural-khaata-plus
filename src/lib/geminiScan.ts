import type { ParsedScanRow } from "@/lib/parseScannedLedger";

type GeminiLedgerRow = {
  name?: string;
  amount?: number | string;
  sign?: string;
  type?: "credit" | "debit" | string;
  description?: string;
};

type GeminiResponse = {
  rows?: GeminiLedgerRow[];
  raw_text?: string;
};

type GeminiApiPart = { text?: string };

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"] as const;

const SYSTEM_PROMPT = [
  "You extract ledger entries from shop khata images.",
  "Return ONLY JSON without markdown fences.",
  "Schema:",
  "{",
  '  "rows": [',
  "    {",
  '      "name": "customer name",',
  '      "amount": 1200,',
  '      "sign": "+|-|none",',
  '      "type": "credit|debit",',
  '      "description": "optional short note"',
  "    }",
  "  ],",
  '  "raw_text": "optional OCR text"',
  "}",
  "Rules:",
  "- Prefer exact names from image text.",
  "- Amount must be numeric and positive.",
  "- Infer type with priority: explicit words > sign > context.",
  "- If sign is '-', type is debit unless explicit phrase contradicts.",
  "- If sign is '+', type is credit unless explicit phrase contradicts.",
  "- If uncertain, skip the row.",
].join("\n");

function stripFences(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to encode image for Gemini."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Encoded image is empty."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read image for Gemini."));
    reader.readAsDataURL(blob);
  });
}

function normalizeAmount(amount: unknown) {
  if (typeof amount === "number" && Number.isFinite(amount)) return Math.abs(amount);
  if (typeof amount === "string") {
    const n = Number(amount.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return Math.abs(n);
  }
  return null;
}

function resolveType(row: GeminiLedgerRow): "credit" | "debit" {
  const typed = String(row.type ?? "").toLowerCase();
  if (typed === "credit" || typed === "debit") return typed;

  const sign = String(row.sign ?? "").trim();
  if (sign.startsWith("-")) return "debit";
  if (sign.startsWith("+")) return "credit";

  const desc = `${row.description ?? ""}`.toLowerCase();
  if (/(paid|returned|debit|settled|gave|ada|واپس|भुगतान|ਵਾਪਸ)/i.test(desc)) return "debit";
  return "credit";
}

function parseGeminiPayload(text: string): GeminiResponse {
  const cleaned = stripFences(text);
  return JSON.parse(cleaned) as GeminiResponse;
}

function pickFirstText(parts: GeminiApiPart[] | undefined) {
  if (!parts || parts.length === 0) return "";
  const textPart = parts.find((part) => typeof part?.text === "string" && part.text.trim());
  return textPart?.text?.trim() || "";
}

function readGeminiKeyFromBrowser() {
  try {
    if (typeof window === "undefined") return "";
    return (
      window.localStorage.getItem("VITE_GEMINI_API_KEY") ||
      window.localStorage.getItem("GEMINI_API_KEY") ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

function resolveGeminiApiKey() {
  const fromEnv = String(import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  return fromEnv || readGeminiKeyFromBrowser();
}

function normalizeModelName(model: string) {
  const value = model.trim().toLowerCase();
  if (!value) return "";

  // Gemini 1.5 is being phased out in some regions/projects.
  // If a legacy model is configured, transparently switch to a modern flash model.
  if (value === "gemini-1.5-flash" || value === "models/gemini-1.5-flash") {
    return "gemini-2.0-flash";
  }

  return value.replace(/^models\//, "");
}

export async function extractLedgerRowsWithGemini(imageBlob: Blob): Promise<{ rows: ParsedScanRow[]; rawText: string }> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Gemini key missing. Set VITE_GEMINI_API_KEY in .env, restart Vite, and hard-refresh the page. " +
      "You can also set localStorage.VITE_GEMINI_API_KEY as a temporary fallback.",
    );
  }
  if (apiKey === "your-gemini-api-key") {
    throw new Error("Gemini key is still a placeholder. Put your real key in .env and restart Vite.");
  }

  const configuredModel = normalizeModelName(String(import.meta.env.VITE_GEMINI_MODEL || ""));
  const models = [configuredModel, ...DEFAULT_MODELS]
    .map(normalizeModelName)
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  const base64Image = await toBase64(imageBlob);

  let parsed: GeminiResponse | null = null;
  let lastReason = "Gemini request failed.";
  const failedModels: string[] = [];

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: SYSTEM_PROMPT },
                {
                  inlineData: {
                    mimeType: imageBlob.type || "image/png",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    const payload = await response.json();
    if (!response.ok) {
      failedModels.push(model);
      lastReason = payload?.error?.message || `Gemini request failed for model ${model}.`;
      continue;
    }

    const text = pickFirstText(payload?.candidates?.[0]?.content?.parts);
    if (!text || typeof text !== "string") {
      failedModels.push(model);
      lastReason = `Gemini returned no text payload for model ${model}.`;
      continue;
    }

    parsed = parseGeminiPayload(text);
    break;
  }

  if (!parsed) {
    throw new Error(`${lastReason} Tried models: ${failedModels.join(", ") || models.join(", ")}.`);
  }

  const rows = (parsed.rows ?? [])
    .map((row, index) => {
      const name = String(row.name ?? "").trim();
      const amount = normalizeAmount(row.amount);
      if (!name || !amount || amount <= 0) return null;

      return {
        id: `scan-gemini-${index}`,
        raw: row.description || name,
        name,
        amount,
        type: resolveType(row),
        description: row.description?.trim() || `${name} ${amount}`,
      } satisfies ParsedScanRow;
    })
    .filter((row): row is ParsedScanRow => !!row);

  return {
    rows,
    rawText: String(parsed.raw_text ?? "").trim(),
  };
}