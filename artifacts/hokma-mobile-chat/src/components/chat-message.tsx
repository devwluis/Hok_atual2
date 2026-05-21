import React, { useState } from "react";
import { Message } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { User, FileText, Image as ImageIcon, Archive, Check, Copy } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

function HokmaAvatar() {
  return (
    <img src="/hokma-logo.png" alt="Hokmá" className="h-full w-full rounded-2xl object-cover" />
  );
}

function AttachmentPill({ name, kind }: { name: string; kind: string }) {
  const Icon = kind === "image" ? ImageIcon : kind === "binary" ? Archive : FileText;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/55 px-2.5 py-1.5 text-[11px] text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="max-w-[180px] truncate">{name}</span>
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (isSystem) {
    return (
      <div className="my-5 flex justify-center">
        <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("mb-6 flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[88%] items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
          isUser ? "border-border bg-secondary text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <HokmaAvatar />}
        </div>

        <div className={cn(
          "relative overflow-hidden rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-card-foreground"
        )}>
          {!isUser && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment) => (
                <AttachmentPill key={attachment.id} name={attachment.name} kind={attachment.kind} />
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.isStreaming && (
            <span className="typing-dots ml-2 inline-flex align-middle">
              <span />
              <span />
              <span />
            </span>
          )}
          {!isUser && message.content && !message.isStreaming && (
            <button
              type="button"
              onClick={copyMessage}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
