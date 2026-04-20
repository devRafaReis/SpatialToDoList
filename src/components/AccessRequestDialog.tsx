import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/i18n/translations";

const NAME_MAX = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

const AccessRequestDialog = ({ open, onClose, defaultEmail = "" }: Props) => {
  const { t } = useTranslation();
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; submit?: string }>({});
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t("nameRequired");
    else if (name.trim().length > NAME_MAX) e.name = t("maxChars", { count: NAME_MAX });
    if (!email.trim()) e.email = t("emailRequired");
    else if (!EMAIL_RE.test(email.trim())) e.email = t("validEmail");
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    // Fetch client IP for server-side rate limiting (best-effort, falls back to null)
    let ip: string | null = null;
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const json = await res.json();
      ip = json.ip ?? null;
    } catch { /* proceed without IP if fetch fails */ }

    const { error: err } = await supabase
      .from("access_requests")
      .insert({ name: name.trim(), email: email.trim().toLowerCase(), ip_address: ip });
    setLoading(false);

    if (err) {
      if (err.code === "23505") {
        setErrors({ submit: t("duplicateRequest") });
      } else if (err.code === "P0001" && err.message === "rate_limit_exceeded") {
        setErrors({ submit: t("tooManyRequests") });
      } else {
        setErrors({ submit: t("failedRequest") });
      }
      return;
    }
    setSent(true);
    closeTimerRef.current = setTimeout(() => handleClose(), 3000);
  };

  const handleClose = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setSent(false);
    setName("");
    setEmail(defaultEmail);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-[95vw] max-w-sm rounded-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base">
            {sent ? t("requestSent") : t("requestAccess")}
          </DialogTitle>
          {!sent && (
            <DialogDescription className="text-sm text-muted-foreground">
              {t("requestAccessDesc")}
            </DialogDescription>
          )}
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              {t("requestSentDesc")}
            </p>
            <Button className="mt-2 w-full" onClick={handleClose}>{t("close")}</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="req-name" className="text-xs">{t("nameLabel")}</Label>
                <span className={`text-[10px] tabular-nums ${name.length > NAME_MAX ? "text-red-400" : "text-muted-foreground/60"}`}>
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <Input
                id="req-name"
                placeholder={t("yourNamePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                autoFocus
                className={errors.name ? "border-red-400 focus-visible:ring-red-400/30" : ""}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="req-email" className="text-xs">{t("emailLabel")}</Label>
              <Input
                id="req-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={errors.email ? "border-red-400 focus-visible:ring-red-400/30" : ""}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            {errors.submit && <p className="text-xs text-red-400">{errors.submit}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                {!loading && <Send className="h-3.5 w-3.5" />}
                {loading ? t("sending") : t("sendRequest")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AccessRequestDialog;
