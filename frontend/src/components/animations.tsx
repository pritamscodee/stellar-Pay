import { motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function AnimatedContainer({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    if (value <= 0) return;
    countRef.current = 0;
    const duration = 1500;
    const steps = Math.ceil(duration / 16);
    const increment = value / steps;
    const timer = setInterval(() => {
      countRef.current++;
      if (countRef.current >= steps) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(increment * countRef.current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  trendUp,
  className,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-hairline/50 bg-surface-card/85 p-5 backdrop-blur-sm transition-all hover:border-hairline hover:shadow-elevated",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 opacity-50 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-ink/60">{icon}</div>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                trendUp
                  ? "bg-success/15 text-success"
                  : "bg-error/15 text-error"
              )}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={trendUp ? "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" : "M2.25 6L9 12.75l4.286-4.286a11.95 11.95 0 014.306 6.43l.536 2.929m0 0l-5.94-2.28m5.94 2.28l2.28-5.941"} />
              </svg>
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-body/80">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function GlassCard({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-hairline/50 bg-surface-card/85 p-6 backdrop-blur-sm transition-all duration-300 hover:border-hairline hover:shadow-elevated",
        className
      )}
      {...props}
    >
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/8 blur-3xl transition-all duration-500 group-hover:bg-primary/12" />
      <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent-teal/5 blur-3xl transition-all duration-500 group-hover:bg-accent-teal/10" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function AnimatedFeedback({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        type === "success"
          ? "border-success/20 bg-success/10 text-success"
          : "border-error/20 bg-error/10 text-error"
      )}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full",
          type === "success" ? "bg-success" : "bg-error"
        )}
      />
      <div className="font-medium font-ui">{message}</div>
    </motion.div>
  );
}

export function AnimatedTxBanner({
  status,
  hash,
  error,
  explorerUrl,
}: {
  status: "idle" | "pending" | "confirming" | "success" | "fail";
  hash?: string;
  error?: string;
  explorerUrl?: string;
}) {
  if (status === "idle") return null;
  const colors = {
    pending: "border-hairline bg-surface-card text-body",
    confirming: "border-accent-amber/20 bg-surface-card text-warning",
    success: "border-success/20 bg-success/10 text-success",
    fail: "border-error/20 bg-error/10 text-error",
  };
  const labels = {
    pending: "Submitting transaction...",
    confirming: "Confirming on ledger...",
    success: "Transaction complete",
    fail: "Transaction failed",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm overflow-hidden",
        colors[status]
      )}
    >
      <span className="shrink-0 mt-0.5">
        {(status === "pending" || status === "confirming") && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        )}
        {status === "success" && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {status === "fail" && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </span>
      <div className="flex flex-col gap-0.5">
        <div className="font-semibold font-ui">{labels[status]}</div>
        {hash && explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs underline mt-0.5 opacity-80 hover:opacity-100"
          >
            View on Explorer ↗
          </a>
        )}
        {error && <div className="text-xs opacity-80 mt-0.5">{error}</div>}
      </div>
    </motion.div>
  );
}
