"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInWithCredentials, signInWithProvider, signUpWithCredentials, type AuthSubmitValues } from "@/lib/auth";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type AuthMode = "signin" | "signup";

interface PasswordInputProps extends React.ComponentProps<"input"> {
  id: string;
}

function PasswordInput({ id, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        className={cn("h-11 pr-11 pl-10 text-sm", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );
}

const PIPELINE = ["Prompt", "Analyze", "Detect", "Decide", "Protect"] as const;

function SecurityPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface-subtle p-8 lg:flex xl:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(148,163,184,0.16),transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div className="relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">PromptShield</span>
        </Link>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          AI security infrastructure
        </p>
        <p className="mt-4 max-w-sm text-3xl font-semibold leading-[1.15] tracking-[-0.04em] text-foreground xl:text-4xl">
          Secure every prompt. Understand every response.
        </p>
        <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
          A security checkpoint between your application and the model that detects
          threats, explains risk, and enforces allow, warn, sanitize, or block
          decisions before execution.
        </p>
      </div>

      <div className="relative" aria-label="PromptShield security pipeline">
        <div className="flex items-center gap-2">
          {PIPELINE.map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {step}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1 rounded-full",
                    index === 0 && "bg-foreground/70",
                    index === 1 && "bg-foreground/50",
                    index === 2 && "bg-status-warn/70",
                    index === 3 && "bg-status-block/60",
                    index === 4 && "bg-status-allow/70",
                  )}
                />
              </div>
              {index < PIPELINE.length - 1 ? (
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Allow", "Warn", "Sanitize", "Block"].map((decision) => (
            <span
              key={decision}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              {decision}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  reducedMotion: boolean;
}

function AuthForm({ mode, onModeChange, reducedMotion }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{ name?: string; email?: string; password?: string }>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "error">("idle");
  const [formError, setFormError] = React.useState<string | null>(null);

  const isSignup = mode === "signup";
  const emailId = isSignup ? "auth-signup-email" : "auth-signin-email";
  const passwordId = isSignup ? "auth-signup-password" : "auth-signin-password";

  function validate(values: AuthSubmitValues) {
    const next: { name?: string; email?: string; password?: string } = {};
    const trimmedEmail = values.email.trim();

    if (isSignup && values.name.trim().length === 0) next.name = "Enter your name.";
    if (trimmedEmail.length === 0) next.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) next.email = "Enter a valid email address.";
    if (values.password.length === 0) next.password = "Enter your password.";
    else if (isSignup && values.password.length < 8) next.password = "Use at least 8 characters.";

    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const values = { name: name.trim(), email: email.trim(), password };
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    setFormError(null);

    try {
      const result = isSignup ? await signUpWithCredentials(values) : await signInWithCredentials(values);
      router.push(result.redirectTo);
    } catch (error) {
      setStatus("error");
      setFormError(friendlyAuthError(error, isSignup));
    }
  }

  const [providerPending, setProviderPending] = React.useState<null | "google" | "github">(null);

  async function handleProvider(provider: "google" | "github") {
    if (providerPending) return;
    setProviderPending(provider);
    setFormError(null);
    try {
      const result = await signInWithProvider(provider);
      router.push(result.redirectTo);
    } catch (error) {
      setFormError(friendlyAuthError(error, false));
    } finally {
      setProviderPending(null);
    }
  }

  function friendlyAuthError(error: unknown, isSignupContext: boolean): string {
    if (error instanceof Error && error.message) {
      const code = (error as { code?: string }).code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Invalid email or password.";
      if (code === "auth/user-not-found") return "No account found for that email.";
      if (code === "auth/email-already-in-use") return "An account with that email already exists.";
      if (code === "auth/weak-password") return "Password is too weak. Use at least 6 characters.";
      if (code === "auth/invalid-email") return "Enter a valid email address.";
      if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled.";
      if (code === "auth/popup-blocked") return "Pop-up was blocked. Allow pop-ups and try again.";
      if (code === "auth/network-request-failed") return "Network error. Check your connection and try again.";
      if (code === "auth/too-many-requests") return "Too many attempts. Please try again later.";
      return error.message;
    }
    return isSignupContext ? "Account creation failed." : "Unable to sign in. Please try again.";
  }

  function handleModeChange(next: AuthMode) {
    setErrors({});
    setFormError(null);
    setStatus("idle");
    setPassword("");
    onModeChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Home
        </Link>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {isSignup
          ? "Sign up to start protecting your AI interactions."
          : "Sign in to continue protecting your AI interactions."}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.form
          key={mode}
          noValidate
          onSubmit={handleSubmit}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: EASE }}
          className="mt-7 space-y-5"
        >
          {isSignup ? (
            <div className="space-y-2">
              <label htmlFor="auth-signup-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                id="auth-signup-name"
                type="text"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={name}
                disabled={status === "submitting"}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "auth-signup-name-error" : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) setErrors((previous) => ({ ...previous, name: undefined }));
                }}
                className="h-11 text-sm"
              />
              {errors.name ? (
                <p id="auth-signup-name-error" role="alert" className="text-xs leading-5 text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor={emailId} className="text-sm font-medium text-foreground">
              Work email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                disabled={status === "submitting"}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) setErrors((previous) => ({ ...previous, email: undefined }));
                }}
                className="h-11 pl-10 text-sm"
              />
            </div>
            {errors.email ? (
              <p id={`${emailId}-error`} role="alert" className="text-xs leading-5 text-destructive">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
                Password
              </label>
              {!isSignup ? (
                <Link
                  href="/login?reset=password"
                  className="rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <PasswordInput
                id={passwordId}
                value={password}
                disabled={status === "submitting"}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? `${passwordId}-error` : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((previous) => ({ ...previous, password: undefined }));
                }}
                className="pl-10"
              />
            </div>
            {errors.password ? (
              <p id={`${passwordId}-error`} role="alert" className="text-xs leading-5 text-destructive">
                {errors.password}
              </p>
            ) : null}
          </div>

          {formError ? (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm leading-6 text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          ) : null}

          <Button type="submit" disabled={status === "submitting"} className="h-11 w-full text-sm">
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {isSignup ? "Creating account…" : "Signing in…"}
              </>
            ) : (
              <>
                {isSignup ? "Create account" : "Continue"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(providerPending)}
              onClick={() => handleProvider("google")}
              className="h-11 text-sm"
            >
              {providerPending === "google" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(providerPending)}
              onClick={() => handleProvider("github")}
              className="h-11 text-sm"
            >
              {providerPending === "github" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Continue with GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => handleModeChange(isSignup ? "signin" : "signup")}
              className="rounded-sm font-medium text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isSignup ? "Sign in" : "Create account"}
            </button>
          </p>
        </motion.form>
      </AnimatePresence>

      <div className="mt-7 border-t border-border pt-5 text-center">
        <p className="text-xs leading-5 text-muted-foreground">
          Protected by PromptShield. View our{" "}
          <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
            Terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = "signin" }: AuthPageProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = React.useState<AuthMode>(initialMode);

  function handleModeChange(next: AuthMode) {
    setMode(next);
    router.replace(next === "signup" ? "/login?mode=signup" : "/login", { scroll: false });
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-x-clip bg-page px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(148,163,184,0.14),transparent_55%)]"
      />
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: EASE }}
        className="relative grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_1.05fr]"
      >
        <SecurityPanel />

        <Card className="w-full min-w-0 rounded-2xl border-border bg-surface p-6 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.25)] sm:p-8 lg:p-10">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-subtle">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
              PromptShield
            </span>
          </div>

          <div role="tablist" aria-label="Authentication mode" className="mb-7 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-subtle p-1">
            {(["signin", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => handleModeChange(value)}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  mode === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === value ? (
                  <motion.span
                    layoutId="auth-mode-indicator"
                    aria-hidden="true"
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: EASE }}
                    className="absolute inset-0 rounded-md border border-border bg-surface shadow-sm"
                  />
                ) : null}
                <span className="relative">{value === "signin" ? "Sign in" : "Sign up"}</span>
              </button>
            ))}
          </div>

          <AuthForm mode={mode} onModeChange={handleModeChange} reducedMotion={Boolean(reducedMotion)} />

          <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-status-allow/20 bg-status-allow/10 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-status-allow" aria-hidden="true" />
            <span>Credentials are handled server-side. Nothing sensitive runs in the browser.</span>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}
