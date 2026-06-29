"use client";
import { motion } from "framer-motion";

export function NuclearCore() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Outer ring */}
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[color:var(--amber)]/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* Middle ring */}
        <motion.span
          className="absolute inset-3 rounded-full border border-[color:var(--amber)]/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        {/* Core */}
        <motion.span
          className="h-10 w-10 rounded-full bg-[color:var(--amber)]"
          animate={{
            scale: [1, 1.12, 1],
            boxShadow: [
              "0 0 12px 2px rgba(245,166,35,0.35)",
              "0 0 28px 8px rgba(245,166,35,0.6)",
              "0 0 12px 2px rgba(245,166,35,0.35)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Hokmá está pronta</p>
        <p className="text-xs text-muted-foreground">Como posso ajudar hoje?</p>
      </div>
    </div>
  );
}
