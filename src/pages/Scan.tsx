import { useRef, useState } from "react";
import { Loader2, ScanLine, Upload } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";

const Scan = () => {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true); setProgress(0); setText("");
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m: any) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const extracted = result.data.text.trim();
      setText(extracted);
      if (!extracted) toast.error(t("no_text_found"));
      else toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e.message || "OCR failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-2xl mx-auto">
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
            {busy ? `${t("scanning")} ${progress}%` : t("upload_image")}
          </Button>
        </Card>

        {imgUrl && (
          <Card className="p-3 border-border overflow-hidden">
            <img src={imgUrl} alt="Scanned" className="w-full max-h-80 object-contain rounded-lg" />
          </Card>
        )}

        {text && (
          <Card className="p-5 border-border">
            <h3 className="font-bold mb-2">{t("extracted_text")}</h3>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted rounded-lg p-3 max-h-80 overflow-auto">
              {text}
            </pre>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default Scan;
