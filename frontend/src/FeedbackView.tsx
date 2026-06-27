import { useState, useEffect } from "react";

const BACKEND_URL = "https://stellar-pay-eia0.onrender.com";

interface FeedbackItem {
  rating: string;
  message: string;
  email: string | null;
  timestamp: string;
}

export default function FeedbackView() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/feedback`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : data.value || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const ratingColor = (r: string) =>
    r === "bug" ? "text-error" : r === "idea" ? "text-accent-amber" : "text-primary";

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-2xl font-normal text-ink mb-2">Feedback Summary</h1>
        <p className="text-body text-sm font-ui mb-6">Collected from Mistral AI user conversations</p>
        {loading ? (
          <p className="text-body text-sm font-ui">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-body text-sm font-ui">No feedback collected yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <div key={i} className="bg-surface-card border border-hairline rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${ratingColor(item.rating)}`}>
                    {item.rating}
                  </span>
                  <span className="text-muted-soft text-[11px] font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-ink font-ui">{item.message}</p>
                {item.email && (
                  <p className="text-xs text-muted mt-1 font-ui">{item.email}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
