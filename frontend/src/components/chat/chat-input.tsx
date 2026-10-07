import * as React from "react"
import { ArrowUp, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ChatInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatInput({ value, onChange, onSubmit, disabled = false, inputRef }: ChatInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!disabled && value.trim()) {
        onSubmit()
      }
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled && value.trim()) {
          onSubmit()
        }
      }}
      className="rounded-2xl border border-border bg-surface/90 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-[box-shadow,transform] duration-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="prompt-input" className="sr-only">
            Ask PromptShield
          </label>
          <Textarea
            ref={inputRef}
            id="prompt-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask PromptShield..."
            disabled={disabled}
            rows={1}
            aria-label="Ask PromptShield"
            className="max-h-40 min-h-[52px] resize-none border-0 bg-transparent px-3 py-3 text-sm leading-6 shadow-none focus-visible:ring-0 focus-visible:border-0"
          />
        </div>

        <Button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send prompt"
          className="h-[52px] w-[52px] rounded-xl p-0 transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0"
        >
          {disabled ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  )
}
