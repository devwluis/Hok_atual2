import React from "react";
import { AGENTS, Agent } from "@/hooks/use-chat";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, BrainCircuit, Code2, Workflow, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const IconMap: Record<string, React.ElementType> = {
  BrainCircuit,
  Code2,
  Workflow,
  Eye
};

interface AgentSwitcherProps {
  activeAgent: Agent;
  setActiveAgent: (agent: Agent) => void;
}

export function AgentSwitcher({ activeAgent, setActiveAgent }: AgentSwitcherProps) {
  const ActiveIcon = IconMap[activeAgent.icon] || BrainCircuit;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 px-3 gap-2 rounded-full bg-secondary/50 border border-transparent hover:border-border transition-colors">
          <ActiveIcon className={cn("w-4 h-4", activeAgent.color)} />
          <span className="font-medium text-sm tracking-tight">{activeAgent.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px] rounded-xl border-border bg-card/95 backdrop-blur-xl p-1 shadow-2xl">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Select Agent Module
        </div>
        {AGENTS.map((agent) => {
          const Icon = IconMap[agent.icon] || BrainCircuit;
          return (
            <DropdownMenuItem 
              key={agent.id}
              onClick={() => setActiveAgent(agent)}
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg cursor-pointer mb-1 last:mb-0",
                activeAgent.id === agent.id ? "bg-secondary" : ""
              )}
            >
              <div className={cn("mt-0.5 w-7 h-7 rounded-md flex items-center justify-center bg-background border", activeAgent.id === agent.id ? "border-primary/30" : "border-border")}>
                <Icon className={cn("w-4 h-4", agent.color)} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm text-foreground">{agent.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{agent.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}