import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, ChevronDown } from "lucide-react";
import { captureFeedback } from "../services/analytics";

const BACKEND_URL = "https://stellar-pay-eia0.onrender.com";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm StellarVote AI. Ask me anything about Web3, Stellar, or Soroban — or share feedback about the app (bugs, ideas, general thoughts) and I'll record it!",
};

const STORAGE_KEY = "stellar_vote_chat_history";

export default function MistralChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [WELCOME];
    } catch {
      return [WELCOME];
    }
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      if (data.feedback_saved) {
        captureFeedback(data.feedback_saved.rating, data.feedback_saved.message);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting. Please try again later.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const clearChat = useCallback(() => {
    setMessages([WELCOME]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {!hasOpened && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-surface-card border border-hairline rounded-xl px-4 py-2 shadow-elevated mb-1"
            >
              <p className="text-xs text-body font-ui whitespace-nowrap">
                Ask me anything about Web3! ✦
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => { setOpen(true); setHasOpened(true); setTimeout(() => inputRef.current?.focus(), 300); }}
          className="w-13 h-13 rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary-active transition-all duration-200 cursor-pointer flex items-center justify-center border-none"
          aria-label="Open AI chat"
        >
          <Sparkles className="w-5 h-5" />
        </motion.button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 right-6 z-50 w-87 sm:w-96 bg-surface-card border border-hairline rounded-2xl shadow-elevated overflow-hidden flex flex-col"
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-surface-soft/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink font-ui leading-tight">
              StellarVote AI
            </p>
            <p className="text-[10px] text-body font-ui">Ask me anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-body hover:text-ink hover:bg-surface-card bg-transparent border-none text-[10px] cursor-pointer transition-colors"
            aria-label="Clear chat"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-body hover:text-ink hover:bg-surface-card bg-transparent border-none cursor-pointer transition-colors"
            aria-label="Close chat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i === messages.length - 1 && msg.role === "assistant" && sending ? 0 : i * 0.03 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed font-ui ${
                msg.role === "user"
                  ? "bg-primary text-on-primary rounded-br-md"
                  : "bg-surface-soft text-body border border-hairline/50 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Suggestion chips — shown only on fresh/welcome-only chat */}
        {messages.length === 1 && !sending && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-1.5 pt-1"
          >
            <p className="text-[10px] text-muted-soft font-ui px-0.5">Quick suggestions:</p>
            {[
              { label: "🐛  Report a bug", text: "I found a bug: " },
              { label: "💡  Share an idea", text: "I have a feature idea: " },
              { label: "💬  General feedback", text: "My general feedback: " },
              { label: "❓  How does voting work?", text: "How does on-chain voting work?" },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  setInput(chip.text);
                  inputRef.current?.focus();
                }}
                className="text-left w-full px-3 py-2 rounded-xl border border-hairline bg-surface-soft hover:border-primary hover:bg-surface-card text-xs text-body font-ui transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </motion.div>
        )}
        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-surface-soft text-body border border-hairline/50 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm font-ui">
              <span className="inline-flex gap-1">
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  className="inline-block w-1.5 h-1.5 rounded-full bg-muted"
                />
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  className="inline-block w-1.5 h-1.5 rounded-full bg-muted"
                />
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  className="inline-block w-1.5 h-1.5 rounded-full bg-muted"
                />
              </span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-hairline p-3 bg-surface-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Web3, Stellar, or share feedback..."
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm text-ink font-ui outline-none placeholder:text-muted-soft focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!input.trim() || sending}
            className="w-9 h-9 shrink-0 rounded-xl bg-primary text-on-primary flex items-center justify-center border-none cursor-pointer hover:bg-primary-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
        <p className="text-[9px] text-muted-soft text-center mt-1.5 font-ui">
          Powered by Mistral AI · May make mistakes
        </p>
      </div>
    </motion.div>
  );
}
