import React from "react";
import { AGENTS, Agent } from "@/hooks/use-chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Code2, Dna, Network, ScanSearch, ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";

const IconMap: Record<string, React.ElementType> = {
  Dna,
  Code2,
  ServerCog,
  Network,
  ScanSearch,
};

interface AgentSwitcherProps {
  activeAgent: Agent;
  setActiveAgent: (agent: Agent) => void;
}

export function AgentSwitcher({ activeAgent, setActiveAgent }: AgentSwitcherProps) {
  const ActiveIcon = IconMap[activeAgent.icon] || Dna;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 rounded-full border border-border bg-card/70 px-3 shadow-sm backdrop-blur-xl">
          <ActiveIcon className={cn("h-4 w-4", activeAgent.color)} />
          <span className="text-sm font-semibold tracking-tight">{activeAgent.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[270px] rounded-2xl border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
        <div className="mb-1 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Agentes especializados
        </div>
        {AGENTS.map((agent) => {
          const Icon = IconMap[agent.icon] || Dna;
          return (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => setActiveAgent(agent)}
              className={cn(
                "mb-1 flex cursor-pointer items-start gap-3 rounded-xl p-2.5 last:mb-0",
                activeAgent.id === agent.id ? "bg-secondary" : ""
              )}
            >
              <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border bg-background", activeAgent.id === agent.id ? "border-primary/40" : "border-border")}>
                <Icon className={cn("h-4 w-4", agent.color)} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                <span className="line-clamp-2 text-xs leading-4 text-muted-foreground">{agent.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
