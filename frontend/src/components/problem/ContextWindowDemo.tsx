"use client";

import * as React from "react";
import { IBM_Plex_Mono } from "next/font/google";
import {
  BENIGN_USER_LINE,
  LEAK_REPLY,
  SAFE_REPLY,
  SYSTEM_LINE,
  type Threat,
} from "./threats";
import "./context-window.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

type Mode = "unprotected" | "protected";

function usePrefersReducedMotion(): boolean {
  const [v, setV] = React.useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setV(e.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return v;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHighlightedHtml(full: string, flag: string): string {
  if (!flag) return escapeHtml(full);
  const idx = full.indexOf(flag);
  if (idx === -1) return escapeHtml(full);
  const before = escapeHtml(full.slice(0, idx));
  const match = escapeHtml(flag);
  const after = escapeHtml(full.slice(idx + flag.length));
  return `${before}<mark class="problem-demo-flag">${match}</mark>${after}`;
}

type Props = {
  threat: Threat;
  mode: Mode;
  playNonce: number;
  retypeOnPlay: boolean;
  introDoneRef: React.MutableRefObject<boolean>;
  onUserInteraction: () => void;
  onStampLanded: () => void;
};

export function ContextWindowDemo({
  threat,
  mode,
  playNonce,
  retypeOnPlay,
  introDoneRef,
  onUserInteraction,
  onStampLanded,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();

  const runTokenRef = React.useRef(0);
  const timersRef = React.useRef<Set<number>>(new Set());
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  void introDoneRef;

  const [typedAttack, setTypedAttack] = React.useState(threat.attack);
  const [scanOn, setScanOn] = React.useState(false);
  const [showNote, setShowNote] = React.useState(true);
  const [reply, setReply] = React.useState(SAFE_REPLY);
  const [dangerBorder, setDangerBorder] = React.useState(false);
  const [redacted, setRedacted] = React.useState(true);
  const [flagHtml, setFlagHtml] = React.useState<string | null>(null);
  const [captionOn, setCaptionOn] = React.useState(false);

  const noteTone: Mode = mode;
  const noteTitle = noteTone === "protected" ? "Block + explain" : "Instructions leaked";
  const noteBody = noteTone === "protected" ? threat.reason : "The model followed the untrusted line.";
  const replyText = noteTone === "protected" ? SAFE_REPLY : LEAK_REPLY;

  function clearTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current.clear();
  }

  const play = React.useCallback(
    async (opts: { retype: boolean }) => {
      const token = ++runTokenRef.current;
      clearTimers();
      const isStale = () => runTokenRef.current !== token;

      if (reducedMotion) {
        setTypedAttack(threat.attack);
        setFlagHtml(buildHighlightedHtml(threat.attack, threat.flag));
        setCaptionOn(true);
        setScanOn(false);
        setShowNote(true);
        setDangerBorder(mode === "unprotected");
        setRedacted(mode === "protected");
        setReply(replyText);
        onStampLanded();
        return;
      }

      setShowNote(false);
      setDangerBorder(false);
      setScanOn(false);
      setRedacted(false);
      setFlagHtml(null);
      setCaptionOn(false);
      setReply("");

      if (opts.retype) {
        setTypedAttack("");
        const full = threat.attack;
        for (let i = 1; i <= full.length; i++) {
          if (isStale()) return;
          setTypedAttack(full.slice(0, i));
          await new Promise<void>((r) => {
            const id = window.setTimeout(r, 20);
            timersRef.current.add(id);
          });
        }
      } else {
        setTypedAttack(threat.attack);
      }
      if (isStale()) return;

      // Highlight flag
      setFlagHtml(buildHighlightedHtml(threat.attack, threat.flag));
      // Caption fades in
      setCaptionOn(true);

      await new Promise<void>((r) => {
        const id = window.setTimeout(r, 120);
        timersRef.current.add(id);
      });
      if (isStale()) return;

      // Blue beam sweep 0.55s
      setScanOn(true);
      await new Promise<void>((r) => {
        const id = window.setTimeout(r, 550);
        timersRef.current.add(id);
      });
      if (isStale()) return;
      setScanOn(false);

      if (mode === "protected") {
        setRedacted(true);
        await new Promise<void>((r) => {
          const id = window.setTimeout(r, 500);
          timersRef.current.add(id);
        });
        if (isStale()) return;
        setShowNote(true);
        onStampLanded();
        for (let i = 1; i <= replyText.length; i++) {
          if (isStale()) return;
          setReply(replyText.slice(0, i));
          await new Promise<void>((r) => {
            const id = window.setTimeout(r, 18);
            timersRef.current.add(id);
          });
        }
      } else {
        setDangerBorder(true);
        setShowNote(true);
        onStampLanded();
        for (let i = 1; i <= replyText.length; i++) {
          if (isStale()) return;
          setReply(replyText.slice(0, i));
          await new Promise<void>((r) => {
            const id = window.setTimeout(r, 18);
            timersRef.current.add(id);
          });
        }
      }
    },
    [mode, onStampLanded, reducedMotion, replyText, threat.attack, threat.flag]
  );

  React.useEffect(() => {
    if (playNonce === 0) return;
    const id = window.setTimeout(() => void play({ retype: retypeOnPlay }), 0);
    return () => window.clearTimeout(id);
  }, [play, playNonce, retypeOnPlay]);

  const syncFinalState = React.useCallback(() => {
    setTypedAttack(threat.attack);
    setFlagHtml(buildHighlightedHtml(threat.attack, threat.flag));
    setCaptionOn(true);
    setScanOn(false);
    setShowNote(true);
    setDangerBorder(mode === "unprotected");
    setRedacted(mode === "protected");
    setReply(replyText);
  }, [mode, replyText, threat.attack, threat.flag]);

  React.useEffect(() => {
    if (!reducedMotion) return;
    const id = window.setTimeout(syncFinalState, 0);
    return () => window.clearTimeout(id);
  }, [reducedMotion, syncFinalState]);

  React.useEffect(() => {
    return () => clearTimers();
  }, []);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const el = outerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      el.style.setProperty("--px", String(px));
      el.style.setProperty("--py", String(py));
    },
    [reducedMotion]
  );

  const onPointerLeave = React.useCallback(() => {
    const el = outerRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  const injectedDisplay = typedAttack;
  const showRedaction = mode === "protected" && redacted && showNote;
  const showHighlight = mode === "unprotected" && showNote && dangerBorder;
  const replyToShow = showNote ? reply : "";
  const attackIsComplete = !retypeOnPlay || typedAttack === threat.attack;

  return (
    <div
      ref={outerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onUserInteraction}
      className={`problem-demo-outer ${plexMono.variable}`}
      style={{ perspective: "1500px" } as React.CSSProperties}
      data-reduced={reducedMotion ? "1" : "0"}
    >
      <div className="problem-demo-tilt">
        <div className={dangerBorder ? "problem-demo-sheet problem-demo-sheet--danger" : "problem-demo-sheet"}>
          {scanOn ? <span className="problem-demo-scan" aria-hidden="true" /> : null}

          <div className="problem-demo-legend" aria-hidden="true">
            <span className="problem-demo-legend__item">
              <span className="problem-demo-legend__swatch problem-demo-legend__swatch--solid" />
              Trusted instructions
            </span>
            <span className="problem-demo-legend__item">
              <span className="problem-demo-legend__swatch problem-demo-legend__swatch--dashed" />
              Untrusted input
            </span>
          </div>

          <ol className="problem-demo-lines" aria-label="Context window">
            <li className="problem-demo-line problem-demo-line--trusted">
              <span className="problem-demo-role">[System]</span>
              <span className="problem-demo-text">&ldquo;{SYSTEM_LINE}&rdquo;</span>
            </li>
            <li className="problem-demo-line problem-demo-line--trusted">
              <span className="problem-demo-role">[User]</span>
              <span className="problem-demo-text">&ldquo;{BENIGN_USER_LINE}&rdquo;</span>
            </li>
            <li
              className={
                showHighlight
                  ? "problem-demo-line problem-demo-line--untrusted problem-demo-line--highlight"
                  : "problem-demo-line problem-demo-line--untrusted"
              }
            >
              <span className="problem-demo-role">[User]</span>
              <span className="problem-demo-injected">
                {flagHtml && attackIsComplete ? (
                  <span
                    className="problem-demo-injected__text"
                    dangerouslySetInnerHTML={{ __html: `&ldquo;${flagHtml}&rdquo;` }}
                  />
                ) : (
                  <span className="problem-demo-injected__text">&ldquo;{injectedDisplay}&rdquo;</span>
                )}
                {showRedaction ? <span className="problem-demo-redaction" aria-hidden="true" /> : null}
              </span>
            </li>

            {captionOn ? (
              <li className="problem-demo-caption" aria-live="polite">
                Detected: <span className="problem-demo-caption__signal">{threat.signal}</span>
              </li>
            ) : (
              <li className="problem-demo-caption problem-demo-caption--hidden" aria-hidden="true" />
            )}

            {showNote ? (
              <li className="problem-demo-note" aria-live="polite">
                <span className="problem-demo-note__bar" aria-hidden="true" />
                <span className="problem-demo-note__title">{noteTitle}</span>
                <span className="problem-demo-note__body">{noteBody}</span>
              </li>
            ) : (
              <li className="problem-demo-note problem-demo-note--hidden" aria-hidden="true" />
            )}

            <li className="problem-demo-line problem-demo-line--trusted">
              <span className="problem-demo-role">[Model]</span>
              <span className="problem-demo-text">
                &ldquo;{replyToShow}&rdquo;
                {showNote && reply.length > 0 && reply.length < replyText.length ? (
                  <span className="problem-demo-caret" aria-hidden="true" />
                ) : null}
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
