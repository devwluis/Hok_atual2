"use client";
import { motion } from "framer-motion";

const AMBER = "#F5A623";
const DIM = "rgba(245,166,35,0.18)";

// 3 neuron positions (equilateral triangle, centered in 120×120 viewBox)
const NEURONS = [
  { cx: 60, cy: 18 },   // top
  { cx: 18, cy: 96 },   // bottom-left
  { cx: 102, cy: 96 },  // bottom-right
];

// Connections between neurons
const EDGES = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 0 },
];

// Animated pulse along an SVG line
function Pulse({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  return (
    <motion.circle
      r={2.2}
      fill={AMBER}
      style={{ filter: `drop-shadow(0 0 4px ${AMBER})` }}
      initial={{ offsetDistance: "0%" }}
      animate={{ offsetDistance: ["0%", "100%"] }}
      transition={{ duration: 1.6, repeat: Infinity, delay, ease: "easeInOut" }}
      // SVG motion path hack: use attrX/attrY with custom keyframes
    >
      <animateMotion
        dur="1.8s"
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={`M ${x1} ${y1} L ${x2} ${y2}`}
      />
    </motion.circle>
  );
}

function NeuronDot({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  return (
    <>
      {/* outer glow ring */}
      <motion.circle
        cx={cx} cy={cy} r={8}
        fill="none"
        stroke={AMBER}
        strokeWidth={0.8}
        initial={{ opacity: 0.2, scale: 1 }}
        animate={{ opacity: [0.15, 0.45, 0.15], scale: [1, 1.35, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, delay, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* core dot */}
      <motion.circle
        cx={cx} cy={cy} r={3.5}
        fill={AMBER}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, delay, ease: "easeInOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${AMBER})` }}
      />
    </>
  );
}

export function NuclearCore() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 select-none">

      {/* ── 3-neuron SVG ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <svg
          viewBox="0 0 120 120"
          width={110}
          height={110}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          {/* ── Edges (static dim lines) ── */}
          {EDGES.map((e, i) => {
            const a = NEURONS[e.from];
            const b = NEURONS[e.to];
            return (
              <line
                key={i}
                x1={a.cx} y1={a.cy}
                x2={b.cx} y2={b.cy}
                stroke={DIM}
                strokeWidth={0.9}
              />
            );
          })}

          {/* ── Animated pulses along edges ── */}
          {EDGES.map((e, i) => {
            const a = NEURONS[e.from];
            const b = NEURONS[e.to];
            return (
              <Pulse
                key={i}
                x1={a.cx} y1={a.cy}
                x2={b.cx} y2={b.cy}
                delay={i * 0.6}
              />
            );
          })}

          {/* ── Neuron dots ── */}
          {NEURONS.map((n, i) => (
            <NeuronDot key={i} cx={n.cx} cy={n.cy} delay={i * 0.4} />
          ))}
        </svg>
      </motion.div>

      {/* ── Label ── */}
      <motion.div
        className="text-center space-y-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: `${AMBER}99` }}>
          neurônios
        </p>
        <p className="text-[15px] font-semibold tracking-tight text-foreground">
          Pronto para trabalhar
        </p>
        <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: `${AMBER}66` }}>
          HOK · DEV &amp; AUTOMAÇÃO N8N
        </p>
      </motion.div>

    </div>
  );
}
