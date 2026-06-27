import { useState, useCallback } from "react";

type FeedbackRating = "bug" | "idea" | "general";

const RATINGS: { value: FeedbackRating; label: string; icon: string }[] = [
  { value: "bug", label: "Bug Report", icon: "!" },
  { value: "idea", label: "Feature Idea", icon: "💡" },
  { value: "general", label: "General", icon: "💬" },
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://stellar-pay-eia0.onrender.com";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<FeedbackRating>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          message: message.trim(),
          email: email.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setMessage("");
          setEmail("");
        }, 2000);
      }
    } catch {
      // fallback to localStorage
      try {
        const saved = JSON.parse(localStorage.getItem("stellar_vote_feedback") || "[]");
        saved.push({ rating, message: message.trim(), email: email.trim() || undefined, timestamp: new Date().toISOString() });
        localStorage.setItem("stellar_vote_feedback", JSON.stringify(saved));
        setSubmitted(true);
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setMessage("");
          setEmail("");
        }, 2000);
      } catch {
        // fail silently
      }
    } finally {
      setSending(false);
    }
  }, [rating, message, email]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-kraken-purple text-white shadow-lg hover:bg-kraken-purple-deep transition-all duration-200 cursor-pointer flex items-center justify-center border-none"
        aria-label="Send feedback"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 bg-surface border border-border-gray rounded-[16px] shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-gray">
        <span className="font-ui text-sm font-bold text-near-black">Send Feedback</span>
        <button
          onClick={() => { setOpen(false); setSubmitted(false); }}
          className="w-7 h-7 flex items-center justify-center rounded-[8px] text-silver-blue hover:text-near-black hover:bg-gray-100 bg-transparent border-none text-sm cursor-pointer transition-colors"
        >
          ✕
        </button>
      </div>

      {submitted ? (
        <div className="p-6 text-center">
          <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-near-black">Thank you!</p>
          <p className="text-xs text-silver-blue mt-1">Your feedback helps improve StellarVote.</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          <div className="flex gap-1.5">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRating(r.value)}
                className={`flex-1 py-2 rounded-[8px] text-xs font-semibold cursor-pointer border transition-colors ${
                  rating === r.value
                    ? "bg-kraken-purple/10 border-kraken-purple text-kraken-purple-dark"
                    : "bg-surface border-border-gray text-silver-blue hover:border-kraken-purple/30"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your feedback..."
            rows={3}
            className="w-full px-3 py-2.5 border border-border-gray rounded-[10px] bg-surface text-sm text-near-black font-ui outline-none resize-none focus:border-kraken-purple focus:ring-1 focus:ring-kraken-purple/20 transition-all"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email (optional)"
            className="w-full px-3 py-2.5 border border-border-gray rounded-[10px] bg-surface text-sm text-near-black font-ui outline-none focus:border-kraken-purple focus:ring-1 focus:ring-kraken-purple/20 transition-all"
          />

          <button
            onClick={handleSubmit}
            disabled={!message.trim() || sending}
            className="w-full py-[10px] rounded-[10px] font-ui text-sm font-semibold cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep disabled:opacity-50 disabled:cursor-not-allowed border-none"
          >
            {sending ? "Sending..." : "Send Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
