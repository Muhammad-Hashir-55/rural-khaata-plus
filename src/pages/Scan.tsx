import { useMemo, useRef, useState } from "react";
import { Check, Eye, FileSearch, Loader2, PencilLine, ScanLine, Sparkles, Upload } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useCustomers } from "@/hooks/useLedger";
import { supabase } from "@/integrations/supabase/client";
import { syncCustomerTrustScore } from "@/lib/trustSync";
import { parseScannedLedger, type ParsedScanRow } from "@/lib/parseScannedLedger";
import { toast } from "sonner";

type OcrOutcome = {
  text: string;
  confidence: number;
  source: "enhanced" | "original";
};

type CanvasBundle = {
  originalBlob: Blob;
  enhancedBlob: Blob;
  previewUrl: string;
};

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const src = URL.createObjectURL(file);
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Could not load the selected image."));
    };
    img.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality = 1) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not prepare image for OCR."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function prepareImageForOcr(file: File): Promise<CanvasBundle> {
  const image = await fileToImage(file);
  const maxWidth = 1800;
  const scale = Math.max(1.8, Math.min(3, maxWidth / image.width));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const originalCanvas = document.createElement("canvas");
  originalCanvas.width = width;
  originalCanvas.height = height;
  const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
  if (!originalCtx) throw new Error("Could not create image context.");

  originalCtx.drawImage(image, 0, 0, width, height);

  const enhancedCanvas = document.createElement("canvas");
  enhancedCanvas.width = width;
  enhancedCanvas.height = height;
  const enhancedCtx = enhancedCanvas.getContext("2d", { willReadFrequently: true });
  if (!enhancedCtx) throw new Error("Could not create enhanced image context.");

  enhancedCtx.drawImage(originalCanvas, 0, 0);
  const imageData = enhancedCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let total = 0;
  const intensities = new Uint8Array(width * height);
  for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    intensities[px] = gray;
    total += gray;
  }

  const avg = total / intensities.length;
  const threshold = Math.max(105, Math.min(190, avg * 0.94));

  for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
    const base = intensities[px];
    const contrastBoost = avg + (base - avg) * 1.65;
    const sharpened = contrastBoost > threshold ? 255 : 0;
    data[i] = sharpened;
    data[i + 1] = sharpened;
    data[i + 2] = sharpened;
    data[i + 3] = 255;
  }

  enhancedCtx.putImageData(imageData, 0, 0);

  return {
    originalBlob: await canvasToBlob(originalCanvas),
    enhancedBlob: await canvasToBlob(enhancedCanvas),
    previewUrl: enhancedCanvas.toDataURL("image/png"),
  };
}

async function recognizeBestOcr(
  originalBlob: Blob,
  enhancedBlob: Blob,
  setProgress: (value: number) => void,
): Promise<OcrOutcome> {
  const Tesseract = (await import("tesseract.js")).default;

  const run = async (blob: Blob, source: OcrOutcome["source"]) => {
    const result = await Tesseract.recognize(blob, "eng", {
      logger: (message: any) => {
        if (message.status === "recognizing text") {
          const offset = source === "enhanced" ? 0 : 50;
          setProgress(offset + Math.round(message.progress * 50));
        }
      },
    }, {
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    return {
      text: result.data.text.trim(),
      confidence: Number(result.data.confidence || 0),
      source,
    } satisfies OcrOutcome;
  };

  const enhanced = await run(enhancedBlob, "enhanced");
  const original = await run(originalBlob, "original");

  const enhancedRows = parseScannedLedger(enhanced.text).length;
  const originalRows = parseScannedLedger(original.text).length;

  if (enhancedRows !== originalRows) {
    return enhancedRows > originalRows ? enhanced : original;
  }

  return enhanced.confidence >= original.confidence ? enhanced : original;
}

const Scan = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedScanRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrSource, setOcrSource] = useState<OcrOutcome["source"] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const customerByName = useMemo(
    () => Object.fromEntries(customers.map((customer) => [customer.name.trim().toLowerCase(), customer])),
    [customers],
  );

  const handleFile = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setText("");
    setRows([]);
    setOcrConfidence(null);
    setOcrSource(null);

    try {
      const prepared = await prepareImageForOcr(file);
      setImgUrl(prepared.previewUrl);

      const best = await recognizeBestOcr(prepared.originalBlob, prepared.enhancedBlob, setProgress);
      const parsedRows = parseScannedLedger(best.text);

      setText(best.text);
      setRows(parsedRows);
      setOcrConfidence(best.confidence);
      setOcrSource(best.source);

      if (!best.text) {
        toast.error(t("no_text_found"));
      } else if (parsedRows.length > 0) {
        toast.success(`Found ${parsedRows.length} possible ledger row${parsedRows.length === 1 ? "" : "s"}.`);
      } else {
        toast.message("Text was recognized, but no ledger rows were confidently detected yet.");
      }
    } catch (e: any) {
      toast.error(e.message || "OCR failed");
    } finally {
      setBusy(false);
      setProgress(100);
    }
  };

  const updateRow = (id: string, patch: Partial<ParsedScanRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const ensureCustomer = async (name: string, resolvedCustomers: Map<string, string>) => {
    if (!user) throw new Error("Please sign in to import scanned rows.");
    const key = name.trim().toLowerCase();
    const existing = resolvedCustomers.get(key) ?? customerByName[key]?.id;
    if (existing) return existing;

    const { data, error } = await supabase
      .from("customers")
      .insert({ user_id: user.id, name })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to create customer for scanned row.");
    resolvedCustomers.set(key, data.id);
    return data.id;
  };

  const handleImport = async () => {
    if (!user) {
      toast.error("Please sign in to import scanned records.");
      return;
    }

    const validRows = rows.filter((row) => row.name.trim() && row.amount > 0);
    if (validRows.length === 0) {
      toast.error("No valid ledger rows were detected yet.");
      return;
    }

    setImporting(true);
    const touchedCustomerIds = new Set<string>();
    const resolvedCustomers = new Map<string, string>(Object.entries(customerByName).map(([name, customer]) => [name, customer.id]));

    try {
      for (const row of validRows) {
        const customerId = await ensureCustomer(row.name.trim(), resolvedCustomers);
        touchedCustomerIds.add(customerId);

        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          customer_id: customerId,
          type: row.type,
          amount: row.amount,
          description: row.description,
          transaction_date: new Date().toISOString().slice(0, 10),
          due_date: null,
        });

        if (error) throw new Error(error.message);
      }

      for (const customerId of touchedCustomerIds) {
        await syncCustomerTrustScore(user.id, customerId);
      }
      await refreshCustomers();
      toast.success(`Imported ${validRows.length} scanned ledger row${validRows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("scan_title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("scan_sub")}</p>

        <Card className="p-6 border-dashed border-2 border-border bg-card">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full h-16 gradient-primary text-primary-foreground text-base"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin me-2" /> : <Upload className="h-5 w-5 me-2" />}
            {busy ? `Improving image and scanning... ${progress}%` : t("upload_image")}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Best results: bright photo, dark handwriting, full page visible, minimal shadows.
          </p>
        </Card>

        {imgUrl && (
          <Card className="p-4 border-border overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  OCR-ready preview
                </h3>
                <p className="text-sm text-muted-foreground">
                  The image below is enhanced before recognition to improve contrast and readability.
                </p>
              </div>
              {ocrConfidence !== null && (
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Confidence {Math.round(ocrConfidence)}% via {ocrSource}
                </div>
              )}
            </div>
            <img src={imgUrl} alt="Scanned" className="w-full max-h-[28rem] object-contain rounded-lg bg-muted/30" />
          </Card>
        )}

        {rows.length > 0 ? (
          <Card className="p-5 border-border">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Detected ledger rows
                </h3>
                <p className="text-sm text-muted-foreground">
                  Review the structured results and import them directly into your digital khata.
                </p>
              </div>
              <Button onClick={handleImport} disabled={importing} className="gradient-primary text-primary-foreground">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${rows.length}`}
              </Button>
            </div>

            <div className="grid gap-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {row.type === "credit" ? "Credit" : "Debit"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                          <Check className="h-3.5 w-3.5" />
                          Rs {row.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-lg font-bold">{row.name}</p>
                      <p className="text-sm text-muted-foreground">{row.description}</p>
                    </div>

                    <Dialog open={editingId === row.id} onOpenChange={(open) => setEditingId(open ? row.id : null)}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="gap-2">
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card">
                        <DialogHeader>
                          <DialogTitle>Edit detected row</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div>
                            <Label>Name</Label>
                            <Input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <Button type="button" variant={row.type === "credit" ? "default" : "outline"} onClick={() => updateRow(row.id, { type: "credit" })}>
                                Credit
                              </Button>
                              <Button type="button" variant={row.type === "debit" ? "default" : "outline"} onClick={() => updateRow(row.id, { type: "debit" })}>
                                Debit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : text ? (
          <Card className="p-5 border-border">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-warning/20 p-2 text-warning-foreground">
                <FileSearch className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">OCR found text, but not clean ledger rows yet</h3>
                <p className="text-sm text-muted-foreground">
                  Try a brighter photo, stronger contrast, or a closer crop around the handwritten entries.
                </p>
                <details className="rounded-xl border border-border bg-muted/20 p-3">
                  <summary className="cursor-pointer text-sm font-medium">Show raw OCR text</summary>
                  <pre className="mt-3 whitespace-pre-wrap text-sm font-mono text-muted-foreground">{text}</pre>
                </details>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
};

export default Scan;
