import React, { useEffect, useRef } from "react";
import { Message } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { Bot, User, TerminalSquare } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-muted-foreground uppercase tracking-widest bg-secondary/50 px-3 py-1 rounded-full border border-border">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn("flex max-w-[85%] items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
        
        <div className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border",
          isUser 
            ? "bg-secondary border-border" 
            : "bg-primary/10 border-primary/30 text-primary"
        )}>
          {isUser ? <User className="w-4 h-4 text-muted-foreground" /> : <Bot className="w-4 h-4" />}
        </div>
        
        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-sm" 
            : "bg-card border border-border text-card-foreground rounded-bl-sm"
        )}>
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-primary align-middle animate-pulse" />
          )}
        </div>

      </div>
    </div>
  );
}