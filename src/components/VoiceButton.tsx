import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type Props = {
  onResult: (transcript: string) => void;
  className?: string;
};

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
      <div className={cn("text-sm text-muted-foreground text-center", className)}>
        {t("voice_unsupported")}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <Button
          type="button"
          size="lg"
          onClick={toggle}
          className={cn(
            "h-28 w-28 rounded-full text-primary-foreground shadow-lg transition-smooth group",
            listening
              ? "gradient-success animate-pulse-mic"
              : "gradient-primary hover:shadow-xl hover:scale-110 active:scale-95"
          )}
          aria-label={t("tap_to_speak")}
        >
          {listening ? (
            <MicOff className="h-12 w-12 animate-bounce-subtle" />
          ) : (
            <Mic className="h-12 w-12 group-hover:animate-float" />
          )}
        </Button>
      </div>
      <div className="text-center space-y-1">
        <p className={cn(
          "text-sm font-semibold transition-smooth",
          listening ? "text-success" : "text-foreground"
        )}>
          {listening ? t("listening") : t("tap_to_speak")}
        </p>
        {!listening && (
          <p className="text-xs text-muted-foreground">{t("hold_and_speak")}</p>
        )}
      </div>
    </div>
  );
};

export default VoiceButton;
