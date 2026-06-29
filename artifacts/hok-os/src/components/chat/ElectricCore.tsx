"use client";
import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";

/* Generates random lightning bolt SVG path between two points */
function makeBolt(x1: number, y1: number, x2: number, y2: number, jitter = 14): string {
  const steps = 6;
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const bx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter * 2;
    const by = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter * 2;
    pts.push([bx, by]);
  }
  pts.push([x2, y2]);
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/* Rotating electron orbit dot */
function OrbitDot({ radius, duration, startAngle = 0, color = "#F5A623" }: {
  radius: number; duration: number; startAngle?: number; color?: string;
}) {
  return (
    <motion.circle
      r={3}
      fill={color}
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      animate={{
        cx: [
          48 + radius * Math.cos(startAngle),
          48 + radius * Math.cos(startAngle + Math.PI / 2),
          48 + radius * Math.cos(startAngle + Math.PI),
          48 + radius * Math.cos(startAngle + 3 * Math.PI / 2),
          48 + radius * Math.cos(startAngle + 2 * Math.PI),
        ],
        cy: [
          48 + radius * Math.sin(startAngle),
          48 + radius * Math.sin(startAngle + Math.PI / 2),
          48 + radius * Math.sin(startAngle + Math.PI),
          48 + radius * Math.sin(startAngle + 3 * Math.PI / 2),
          48 + radius * Math.sin(startAngle + 2 * Math.PI),
        ],
      }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* Randomly generated arc that re-renders on timer */
function LightningArcs({ cx = 48, cy = 48 }: { cx?: number; cy?: number }) {
  const [arcs, setArcs] = useState<string[]>([]);
  const frameRef = useRef(0);

  useAnimationFrame(() => {
    frameRef.current++;
    if (frameRef.current % 3 !== 0) return; // throttle to ~20fps
    const count = 2 + Math.floor(Math.random() * 3);
    const next: string[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 14 + Math.random() * 18;
      const ex = cx + Math.cos(angle) * len;
      const ey = cy + Math.sin(angle) * len;
      next.push(makeBolt(cx, cy, ex, ey, 6));
    }
    setArcs(next);
  });

  return (
    <>
      {arcs.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="#00D4FF"
          strokeWidth={0.8 + Math.random() * 0.8}
          strokeLinecap="round"
          fill="none"
          opacity={0.55 + Math.random() * 0.4}
          style={{ filter: "drop-shadow(0 0 3px #00D4FF)" }}
        />
      ))}
    </>
  );
}

/* ── Main component ── */
export function ElectricCore({ label = "Hokmá está pensando…", modelName }: {
  label?: string;
  modelName?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg width={96} height={96} className="absolute inset-0 overflow-visible">
          {/* Outer glow ring */}
          <motion.circle
            cx={48} cy={48} r={42}
            stroke="#F5A623"
            strokeWidth={0.6}
            fill="none"
            opacity={0.2}
            animate={{ r: [42, 45, 42] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Orbit ring 1 — tilted */}
          <motion.ellipse
            cx={48} cy={48} rx={30} ry={10}
            stroke="#F5A623"
            strokeWidth={0.7}
            fill="none"
            opacity={0.35}
            animate={{ rotate: [0, 360] }}
            style={{ transformOrigin: "48px 48px" }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Orbit ring 2 — different tilt */}
          <motion.ellipse
            cx={48} cy={48} rx={10} ry={30}
            stroke="#00D4FF"
            strokeWidth={0.7}
            fill="none"
            opacity={0.25}
            animate={{ rotate: [0, -360] }}
            style={{ transformOrigin: "48px 48px" }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          {/* Lightning arcs from core */}
          <LightningArcs cx={48} cy={48} />
          {/* Orbiting electrons */}
          <OrbitDot radius={30} duration={3.5} startAngle={0} color="#F5A623" />
          <OrbitDot radius={30} duration={3.5} startAngle={Math.PI} color="#F5A623" />
          <OrbitDot radius={30} duration={5} startAngle={Math.PI / 2} color="#00D4FF" />
        </svg>

        {/* Pulsing core sphere */}
        <motion.div
          className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--amber)]"
          animate={{
            scale: [1, 1.15, 0.98, 1.1, 1],
            boxShadow: [
              "0 0 8px 2px rgba(245,166,35,0.4), 0 0 0px 0px rgba(0,212,255,0.0)",
              "0 0 24px 8px rgba(245,166,35,0.7), 0 0 18px 4px rgba(0,212,255,0.4)",
              "0 0 10px 3px rgba(245,166,35,0.5), 0 0 6px 1px rgba(0,212,255,0.2)",
              "0 0 28px 10px rgba(245,166,35,0.8), 0 0 24px 8px rgba(0,212,255,0.5)",
              "0 0 8px 2px rgba(245,166,35,0.4), 0 0 0px 0px rgba(0,212,255,0.0)",
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Inner spark */}
          <motion.div
            className="h-4 w-4 rounded-full bg-white/80"
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      <div className="text-center">
        <motion.p
          className="text-sm font-semibold text-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          {label}
        </motion.p>
        {modelName && (
          <motion.p
            className="mt-0.5 text-[11px] text-[color:var(--cyan-glow)] font-mono"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ⚡ {modelName}
          </motion.p>
        )}
      </div>
    </div>
  );
}
