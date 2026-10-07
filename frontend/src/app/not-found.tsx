import Link from "next/link";
import { ArrowLeft, Home, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          PromptShield
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
          Page not found
        </h1>

        <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
          The route you&apos;re looking for doesn&apos;t exist or may have moved. You can return home or open the application workspace.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to application
          </Link>
        </div>
      </div>
    </main>
  );
}
