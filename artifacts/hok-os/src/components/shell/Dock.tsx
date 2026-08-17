"use client";
import { motion } from "framer-motion";
import { useAppState } from "@/hooks/use-app-state";
import type { ScreenId } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const ITEMS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "hok-chat.png" },
  { id: "terminal", label: "Terminal", icon: "hok-terminal.png" },
  { id: "n8n", label: "N8N", icon: "hok-n8n.png" },
  { id: "settings", label: "Config", icon: "hok-config.png" },
];

const iconUrl = (fileName: string) => `${import.meta.env.BASE_URL}icons/${fileName}`;

export function Dock() {
  const { screen, setScreen } = useAppState();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex items-end justify-center pb-2 pointer-events-none">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="pointer-events-auto flex items-center gap-1 rounded-[28px] border border-border bg-[#11151c]/95 px-2.5 py-2 shadow-[var(--shadow-window)] backdrop-blur-xl"
      >
        {ITEMS.map(({ id, label, icon }) => {
          const active = screen === id;
          return (
            <motion.button
              type="button"
              key={id}
              onClick={() => setScreen(id)}
              whileTap={{ scale: 0.88 }}
              className={cn(
                "hok-dock-item relative flex h-[60px] w-[62px] flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors",
                active
                  ? "bg-[color:var(--amber)]/12 text-[color:var(--amber)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              data-testid={`button-dock-${id}`}
            >
              <img
                src={iconUrl(icon)}
                alt=""
                aria-hidden="true"
                className={cn("h-8 w-8 rounded-lg object-cover transition-opacity", active ? "opacity-100" : "opacity-70")}
              />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              {active && (
                <motion.span
                  layoutId="dock-indicator"
                  className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[color:var(--amber)]"
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
