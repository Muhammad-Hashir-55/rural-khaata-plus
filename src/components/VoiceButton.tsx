import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type Props = {
  onResult: (transcript: string) => void;
  className?: string;
};

// Web Speech API wrapper. Uses current i18n speech code.
const VoiceButton = ({ onResult, className }: Props) => {
  const { t, speechCode } = useI18n();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.lang = speechCode;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
    };
  }, [speechCode, onResult]);

  const toggle = () => {
    if (!supported) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    } else {
      try {
        recRef.current.lang = speechCode;
        recRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  if (!supported) {
    return (
      <div className={cn("text-sm text-muted-foreground text-center", className)}>{t("voice_unsupported")}</div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Button
        type="button"
        size="lg"
        onClick={toggle}
        className={cn(
          "h-24 w-24 rounded-full text-primary-foreground shadow-elevated transition-smooth",
          listening ? "gradient-debit animate-pulse-mic" : "gradient-primary hover:scale-105"
        )}
        aria-label={t("tap_to_speak")}
      >
        {listening ? <MicOff className="!h-10 !w-10" /> : <Mic className="!h-10 !w-10" />}
      </Button>
      <p className="text-sm font-medium text-foreground">{listening ? t("listening") : t("tap_to_speak")}</p>
    </div>
  );
};

export default VoiceButton;
