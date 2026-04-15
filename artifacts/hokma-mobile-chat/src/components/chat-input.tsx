import React, { useRef, useEffect } from "react";
import { Send, Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (value: string) => void;
  isStreaming: boolean;
}

export function ChatInput({ input, setInput, onSend, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming) {
      onSend(input);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
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
    // Auto-resize
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-border z-10 sticky bottom-0">
      <form 
        onSubmit={handleSubmit}
        className="flex items-end gap-2 max-w-3xl mx-auto relative"
      >
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-5 h-5" />
        </Button>
        
        <div className="relative flex-1 bg-secondary border border-border rounded-3xl overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Command Hokma..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none py-3 px-4 max-h-[120px] min-h-[44px] focus:outline-none text-sm block"
            rows={1}
            disabled={isStreaming}
          />
        </div>

        {input.trim() ? (
          <Button 
            type="submit" 
            disabled={isStreaming}
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all scale-100 animate-in zoom-in duration-200"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        ) : (
          <Button 
            type="button" 
            variant="secondary"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground transition-all scale-100 animate-in zoom-in duration-200"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </form>
    </div>
  );
}