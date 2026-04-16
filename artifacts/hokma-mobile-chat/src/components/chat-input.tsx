import React, { useRef, useState } from "react";
import { Send, Mic, Plus, X, FileText, Image as ImageIcon, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/hooks/use-chat";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (value: string, attachments?: Attachment[]) => void;
  isStreaming: boolean;
}

const TEXT_TYPES = ["text/", "application/json", "application/javascript", "application/typescript", "application/xml", "text/css"];

function isReadableText(file: File) {
  const name = file.name.toLowerCase();
  return TEXT_TYPES.some((type) => file.type.startsWith(type) || file.type === type)
    || /\.(txt|md|csv|json|js|jsx|ts|tsx|py|html|css|sql|xml|yaml|yml|rs|go|java|c|cpp|h|sh|env|toml)$/i.test(name);
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AttachmentIcon({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  if (attachment.kind === "binary") return <Archive className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export function ChatInput({ input, setInput, onSend, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isReading, setIsReading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachments.length) && !isStreaming && !isReading) {
      onSend(input, attachments);
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 132)}px`;
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsReading(true);
    try {
      const parsed = await Promise.all(files.map(async (file) => {
        const base = {
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
        };
        if (file.type.startsWith("image/")) {
          return { ...base, kind: "image" as const, dataUrl: await readFileAsDataUrl(file) };
        }
        if (isReadableText(file)) {
          return { ...base, kind: "text" as const, content: (await readFileAsText(file)).slice(0, 120000) };
        }
        return { ...base, kind: "binary" as const };
      }));
      setAttachments((current) => [...current, ...parsed].slice(0, 8));
    } finally {
      setIsReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="sticky bottom-0 z-20 border-t border-border/70 bg-background/85 px-3 py-3 backdrop-blur-2xl">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-2">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-2 text-xs text-foreground shadow-sm">
                <AttachmentIcon attachment={attachment} />
                <span className="max-w-[150px] truncate">{attachment.name}</span>
                <button type="button" onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))} className="rounded-full text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-[1.7rem] border border-border bg-card/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.16)] dark:shadow-[0_20px_70px_rgba(0,255,255,0.08)]">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} accept="image/*,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.zip,.go,.rs,.sh,.xml,.yaml,.yml" />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={isStreaming || isReading} className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-primary">
            <Plus className="h-5 w-5" />
          </Button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isReading ? "Lendo arquivos..." : "Ask HokClaw..."}
            className="max-h-[132px] min-h-[42px] flex-1 resize-none bg-transparent px-1 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            rows={1}
            disabled={isStreaming || isReading}
          />

          {input.trim() || attachments.length ? (
            <Button type="submit" disabled={isStreaming || isReading} size="icon" className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Send className="ml-0.5 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="icon" className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
