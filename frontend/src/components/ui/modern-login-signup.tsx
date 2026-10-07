"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DotFieldCanvas } from "@/components/ui/dot-field-canvas";
import {
  signInWithCredentials,
  signInWithProvider,
  signUpWithCredentials,
  type AuthProvider,
  type AuthSubmitValues,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Mode = "login" | "signup";

type FieldErrors = { name?: string; email?: string; password?: string };

/**
 * Brand marks are official Google / GitHub glyph paths. lucide-react v1 removed
 * its brand icon set, and lucide's `Apple` is the fruit, not the vendor mark,
 * so these cannot be substituted with lucide icons.
 */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 fill-current">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

const PROVIDERS: { id: AuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Google", icon: <GoogleIcon /> },
  { id: "github", label: "GitHub", icon: <GitHubIcon /> },
];

function PasswordField({
  id,
  value,
  disabled,
  invalid,
  autoComplete,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  disabled: boolean;
  invalid: boolean;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <Lock
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        required
        onChange={(event) => onChange(event.target.value)}
        className="h-11 pl-10 pr-11 text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </>
  );
}

export interface ModernLoginSignupProps {
  initialMode?: Mode;
}

export default function ModernLoginSignup({ initialMode = "login" }: ModernLoginSignupProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = React.useState<Mode>(initialMode);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "error">("idle");
  const [pendingProvider, setPendingProvider] = React.useState<AuthProvider | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const isSignup = mode === "signup";
  const emailId = isSignup ? "ps-signup-email" : "ps-login-email";
  const passwordId = isSignup ? "ps-signup-password" : "ps-login-password";
  const nameId = "ps-signup-name";
  const busy = status === "submitting" || pendingProvider !== null;

  function validate(values: AuthSubmitValues): FieldErrors {
    const next: FieldErrors = {};
    const trimmedEmail = values.email.trim();

    if (isSignup && values.name.trim().length === 0) next.name = "Enter your name.";
    if (trimmedEmail.length === 0) next.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      next.email = "Enter a valid email address.";
    if (values.password.length === 0) next.password = "Enter your password.";
    else if (isSignup && values.password.length < 8) next.password = "Use at least 8 characters.";

    return next;
  }

  function friendlyMessage(error: unknown): string | null {
    const code = (error as { code?: string })?.code;
    if (!code) return null;
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/user-not-found":
        return "No account found for that email.";
      case "auth/email-already-in-use":
        return "An account with that email already exists.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 6 characters.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled.";
      case "auth/popup-blocked":
        return "Pop-up was blocked. Allow pop-ups and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return null;
    }
  }

  function surfaceError(error: unknown) {
    setStatus("error");
    setPendingProvider(null);
    const mapped = friendlyMessage(error);
    const fallback =
      error instanceof Error && error.message
        ? error.message
        : isSignup
          ? "Account creation failed."
          : "Unable to sign in. Please try again.";
    setFormError(mapped ?? fallback);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const values = { name: name.trim(), email: email.trim(), password };
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    setFormError(null);

    try {
      const result = isSignup ? await signUpWithCredentials(values) : await signInWithCredentials(values);
      router.push(result.redirectTo);
      router.refresh();
    } catch (error) {
      surfaceError(error);
    }
  }

  async function handleProvider(provider: AuthProvider) {
    if (busy) return;
    setFormError(null);
    setPendingProvider(provider);

    try {
      const result = await signInWithProvider(provider);
      router.push(result.redirectTo);
      router.refresh();
    } catch (error) {
      surfaceError(error);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setFormError(null);
    setStatus("idle");
    setPendingProvider(null);
    setPassword("");
  }

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-x-clip bg-page px-4 py-10 sm:px-6 lg:px-8">
      <DotFieldCanvas />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,var(--page-background)_0%,color-mix(in_oklch,var(--page-background)_72%,transparent)_38%,transparent_70%)]"
      />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: EASE }}
        className="relative w-full max-w-[400px]"
      >
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-focus/60 to-transparent"
          />

          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              aria-label="PromptShield home"
              className="mb-6 flex size-11 items-center justify-center rounded-full border border-border bg-surface-subtle text-foreground transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <ShieldCheck className="size-5" aria-hidden="true" />
            </Link>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.26, ease: EASE }}
                className="w-full"
              >
                <h1 className="text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-[1.35rem]">
                  {isSignup ? "Create your PromptShield account" : "Welcome back"}
                </h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {isSignup
                    ? "Start protecting your AI interactions."
                    : "Sign in to continue protecting your AI interactions."}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-subtle p-1"
          >
            {(["login", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  mode === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === value ? (
                  <motion.span
                    layoutId="ps-auth-tab"
                    aria-hidden="true"
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: EASE }}
                    className="absolute inset-0 rounded-md border border-border bg-card shadow-sm"
                  />
                ) : null}
                <span className="relative">
                  {value === "login" ? "Sign in" : "Sign up"}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={mode}
              noValidate
              onSubmit={handleSubmit}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: EASE }}
              className="mt-6 flex flex-col gap-3.5"
            >
              {isSignup ? (
                <div className="space-y-1.5">
                  <label htmlFor={nameId} className="text-sm font-medium text-foreground">
                    Full name
                  </label>
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id={nameId}
                      type="text"
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      value={name}
                      disabled={busy}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? `${nameId}-error` : undefined}
                      onChange={(event) => {
                        setName(event.target.value);
                        clearError("name");
                      }}
                      className="h-11 pl-10 text-sm"
                    />
                  </div>
                  {errors.name ? (
                    <p id={`${nameId}-error`} role="alert" className="text-xs leading-5 text-destructive">
                      {errors.name}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor={emailId} className="text-sm font-medium text-foreground">
                  Work email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id={emailId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    disabled={busy}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? `${emailId}-error` : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError("email");
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

              <div className="space-y-1.5">
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
                  <PasswordField
                    id={passwordId}
                    value={password}
                    disabled={busy}
                    invalid={Boolean(errors.password)}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 8 characters" : "Your password"}
                    onChange={(value) => {
                      setPassword(value);
                      clearError("password");
                    }}
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
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-md text-sm"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>{isSignup ? "Creating account…" : "Signing in…"}</span>
                  </>
                ) : (
                  <>
                    <span>{isSignup ? "Sign up with email" : "Continue with email"}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          <div className="my-6 flex items-center gap-3" role="separator" aria-label="Or continue with">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Or
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-2.5">
            {PROVIDERS.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => handleProvider(provider.id)}
                className="h-11 w-full rounded-md border-border bg-card text-sm"
              >
                {pendingProvider === provider.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  provider.icon
                )}
                <span>
                  {pendingProvider === provider.id
                    ? `Connecting to ${provider.label}…`
                    : `Continue with ${provider.label}`}
                </span>
              </Button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
              className="rounded-sm font-medium text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isSignup ? "Sign in" : "Create account"}
            </button>
          </p>

          <p className="mt-6 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
            By continuing you agree to the PromptShield{" "}
            <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </motion.div>
    </main>
  );
}