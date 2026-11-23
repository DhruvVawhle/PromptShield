"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function PreBlock({ children }: React.ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = React.useState(false);

  // Extract code text and language from the inner <code> child passed by react-markdown
  const codeElement = React.isValidElement(children) ? children : null;
  const childProps = (codeElement?.props || {}) as {
    className?: string;
    children?: React.ReactNode;
  };
  const className = childProps.className || "";
  const match = /language-(\w+)/.exec(className);
  const language = match ? match[1] : "";
  const codeString = String(
    childProps.children ?? (typeof children === "string" ? children : "")
  ).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div className="my-3 rounded-lg border border-border/70 bg-muted/30 overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border/50 text-[11px] font-mono text-muted-foreground">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors p-1 rounded"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-[10px] font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre
        data-lenis-prevent
        className="p-3.5 overflow-x-auto overscroll-x-contain text-[12px] font-mono leading-relaxed text-foreground"
      >
        <code className={className}>{codeString}</code>
      </pre>
    </div>
  );
}

function InlineCode({
  children,
  className,
  node,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  node?: any;
  [key: string]: any;
}) {
  return (
    <code
      className={cn(
        "px-1.5 py-0.5 rounded-md font-mono text-[12px] bg-muted/80 text-foreground border border-border/50",
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("markdown-content text-sm leading-relaxed space-y-2", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/50 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold tracking-tight text-foreground mt-3 mb-1.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed text-foreground/95">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-foreground/95">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-foreground/95">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/50 pl-3.5 my-2.5 italic text-muted-foreground bg-muted/20 py-1 rounded-r-md">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3.5 border-border/60" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/70 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60 border-b border-border/60 text-foreground font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-foreground/90">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium transition-colors"
            >
              {children}
            </a>
          ),
          pre: PreBlock as any,
          code: InlineCode as any,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
