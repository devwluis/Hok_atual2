"use client";
import { motion } from "framer-motion";

export function NuclearCore() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      {/* Minimalist electric idle */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg width={80} height={80} viewBox="0 0 80 80" className="absolute inset-0 overflow-visible">
          {/* Outer ring — slow breathe */}
          <motion.circle cx={40} cy={40} r={36} fill="none"
            stroke="var(--amber)" strokeWidth={0.8} opacity={0.18}
            animate={{ r: [36, 38, 36], opacity: [0.18, 0.28, 0.18] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Mid ring */}
          <motion.circle cx={40} cy={40} r={26} fill="none"
            stroke="var(--amber)" strokeWidth={1} opacity={0.35}
            animate={{ r: [26, 28, 26] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          {/* Crosshair lines — cardinal */}
          {[0, 90, 180, 270].map((deg) => (
            <motion.line
              key={deg}
              x1={40 + Math.cos((deg * Math.PI) / 180) * 18}
              y1={40 + Math.sin((deg * Math.PI) / 180) * 18}
              x2={40 + Math.cos((deg * Math.PI) / 180) * 32}
              y2={40 + Math.sin((deg * Math.PI) / 180) * 32}
              stroke="var(--amber)" strokeWidth={1} strokeLinecap="round"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: deg / 360 }}
            />
          ))}
          {/* Corner ticks */}
          {[45, 135, 225, 315].map((deg) => (
            <motion.line
              key={`t${deg}`}
              x1={40 + Math.cos((deg * Math.PI) / 180) * 30}
              y1={40 + Math.sin((deg * Math.PI) / 180) * 30}
              x2={40 + Math.cos((deg * Math.PI) / 180) * 36}
              y2={40 + Math.sin((deg * Math.PI) / 180) * 36}
              stroke="var(--amber)" strokeWidth={0.8} strokeLinecap="round" opacity={0.25}
            />
          ))}
        </svg>

        {/* Center dot — cursor pulse */}
        <motion.div
          className="relative z-10 h-2.5 w-2.5 rounded-full bg-[color:var(--amber)]"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.7, 1, 0.7],
            boxShadow: [
              "0 0 4px 1px rgba(245,166,35,0.3)",
              "0 0 14px 4px rgba(245,166,35,0.65)",
              "0 0 4px 1px rgba(245,166,35,0.3)",
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Dev-focused text */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground tracking-tight">
          Pronto para trabalhar
        </p>
        <p className="text-[11px] font-mono text-[color:var(--amber)]/60 uppercase tracking-widest">
          HOK · Dev &amp; Automação
        </p>
        <p className="text-xs text-muted-foreground">
          Como posso ajudar com seu projeto?
        </p>
      </div>
    </div>
  );
}
