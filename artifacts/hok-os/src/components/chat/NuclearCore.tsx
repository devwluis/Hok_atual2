"use client";
import { motion } from "framer-motion";

export function NuclearCore() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      {/* Arc Reactor */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Outer dashed ring */}
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            border: "1.5px dashed rgba(0,212,255,0.25)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        {/* Outer solid ring */}
        <motion.span
          className="absolute inset-1 rounded-full"
          style={{ border: "1px solid rgba(245,166,35,0.2)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        {/* Mid ring cyan */}
        <motion.span
          className="absolute inset-4 rounded-full"
          style={{
            border: "1.5px solid rgba(0,212,255,0.35)",
            boxShadow: "0 0 10px rgba(0,212,255,0.15)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner ring amber */}
        <motion.span
          className="absolute inset-7 rounded-full"
          style={{ border: "1.5px solid rgba(245,166,35,0.5)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Arc reactor core */}
        <motion.span
          className="relative h-8 w-8 rounded-full"
          style={{ background: "radial-gradient(circle, #F5A623 0%, #c47b00 60%, #7a4c00 100%)" }}
          animate={{
            scale: [1, 1.15, 1],
            boxShadow: [
              "0 0 12px 3px rgba(245,166,35,0.4), 0 0 24px 6px rgba(0,212,255,0.15)",
              "0 0 28px 8px rgba(245,166,35,0.7), 0 0 48px 14px rgba(0,212,255,0.25)",
              "0 0 12px 3px rgba(245,166,35,0.4), 0 0 24px 6px rgba(0,212,255,0.15)",
            ],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Rotating tick marks */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <motion.span
            key={deg}
            className="absolute h-1.5 w-0.5 rounded-full bg-[color:var(--cyan-glow)]/30"
            style={{
              top: "50%", left: "50%",
              transformOrigin: "50% -38px",
              transform: `rotate(${deg}deg) translateX(-50%)`,
            }}
          />
        ))}
      </div>

      {/* Jarvis-style status text */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold tracking-wide text-foreground">
          Sistemas Ativos
        </p>
        <p className="text-xs tracking-wider text-[color:var(--cyan-glow)]/70 uppercase font-mono">
          H.O.K. · pronto para operar
        </p>
        <p className="text-[11px] text-muted-foreground">
          Como posso auxiliar, Sr.?
        </p>
      </div>
    </div>
  );
}
