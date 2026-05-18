import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import emailjs from "@emailjs/browser";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import supabase from "../lib/supabaseClient";

const RATING_EMOJIS = ["😔", "😕", "😐", "🙂", "😍"] as const;
const RATING_LABEL_KEYS = [
  "settings.support.rating.veryPoor",
  "settings.support.rating.poor",
  "settings.support.rating.okay",
  "settings.support.rating.good",
  "settings.support.rating.excellent",
] as const;

function RatingPopup() {
  const { t } = useTranslation();
  const { user, loginCount } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasRated = Boolean(user?.user_metadata?.has_rated);

  useEffect(() => {
    if (loginCount === 2 && !hasRated) setOpen(true);
  }, [loginCount, hasRated]);

  async function markRated() {
    try {
      await supabase.auth.updateUser({ data: { has_rated: true } });
    } catch {
      // best-effort
    }
  }

  async function handleDismiss() {
    setOpen(false);
    await markRated();
  }

  async function handleSubmit() {
    if (rating === null) return;
    setSubmitting(true);
    const emoji = RATING_EMOJIS[rating];
    const ratingLabel = t(RATING_LABEL_KEYS[rating]);
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_RATING_TEMPLATE_ID,
        {
          from_name: user?.user_metadata?.username ?? "User",
          from_email: user?.email ?? "unknown",
          emoji,
          rating: `${emoji} ${ratingLabel}`,
          message: comment || "No message provided",
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );
      await markRated();
      toast.success(t("ratingPopup.thanks"));
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.text || err?.message || t("settings.support.sendError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-xs flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-[#666] mb-6">
          {t("ratingPopup.title")}
        </p>

        {/* Subtitle */}
        <p className="text-sm text-white/80 dark:text-white/60 mb-8 leading-relaxed">
          {t("ratingPopup.subtitle")}
        </p>

        {/* Emoji row */}
        <div className="flex gap-3 mb-3">
          {RATING_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              aria-label={t(RATING_LABEL_KEYS[i])}
              className={`text-[2.8rem] leading-none transition-all duration-200 select-none ${
                rating === i
                  ? "scale-110 opacity-100 grayscale-0"
                  : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0 hover:scale-105"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Rating label */}
        <p className="text-xs font-medium text-white/70 dark:text-white/50 mb-6 h-4 transition-opacity duration-200">
          {rating !== null ? t(RATING_LABEL_KEYS[rating]) : ""}
        </p>

        {/* Comment input — slides in when rating is selected */}
        <div
          className={`w-full overflow-hidden transition-all duration-300 ease-out ${
            rating !== null ? "max-h-16 opacity-100 mb-8" : "max-h-0 opacity-0 mb-0"
          }`}
        >
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("ratingPopup.commentPlaceholder")}
            className="w-full bg-transparent border-0 border-b border-white/30 dark:border-white/20 pb-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/70 dark:focus:border-white/50 transition-colors text-center"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white/60 hover:text-white/90 transition-colors disabled:opacity-40"
          >
            {t("ratingPopup.maybeLater")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === null || submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-emerald-500 dark:bg-[#e8643a] text-white hover:bg-emerald-400 dark:hover:bg-[#d2552d] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t("ratingPopup.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RatingPopup;
