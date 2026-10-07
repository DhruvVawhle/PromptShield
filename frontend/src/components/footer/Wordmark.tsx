"use client";

import * as React from "react";

const TEXT = "PROMPTSHIELD";

export function Wordmark() {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const revealedRef = React.useRef(false);

  const fit = React.useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const style = getComputedStyle(wrapper);
    const measurer = document.createElement("span");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.pointerEvents = "none";
    measurer.style.whiteSpace = "nowrap";
    measurer.style.fontSize = "100px";
    measurer.style.fontFamily = style.fontFamily;
    measurer.style.fontWeight = style.fontWeight;
    measurer.style.letterSpacing = style.letterSpacing;
    measurer.style.textTransform = style.textTransform || "none";
    measurer.textContent = TEXT;
    document.body.appendChild(measurer);
    const naturalWidth = measurer.getBoundingClientRect().width;
    document.body.removeChild(measurer);
    const containerWidth = wrapper.clientWidth;
    if (naturalWidth === 0 || containerWidth === 0) return;
    const fs = Math.floor((containerWidth / naturalWidth) * 100);
    const clampedFs = Math.max(28, Math.min(fs, 220));
    wrapper.style.setProperty("--fs", `${clampedFs}px`);
  }, []);

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const letters = wrapper.querySelectorAll<HTMLElement>("[data-letter]");
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReduced = mql.matches;

    if (!prefersReduced) {
      letters.forEach((el) => {
        el.style.transform = "translateY(70%)";
        el.style.opacity = "0";
      });
    }

    const reveal = () => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      if (prefersReduced) return;
      letters.forEach((el, i) => {
        el.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease";
        el.style.transitionDelay = `${i * 45}ms`;
        el.style.transform = "translateY(0)";
        el.style.opacity = "1";
      });
      const onEnd = () => {
        letters.forEach((el) => {
          el.style.transition = "transform 160ms ease, opacity 160ms ease";
          el.style.transitionDelay = "0ms";
        });
        letters.forEach((el) => {
          el.addEventListener("mouseenter", () => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            el.style.transform = "translateY(-0.04em)";
          });
          el.addEventListener("mouseleave", () => {
            el.style.transform = "translateY(0)";
          });
        });
      };
      const last = letters[letters.length - 1];
      if (last) {
        let done = false;
        const fire = () => {
          if (done) return;
          done = true;
          onEnd();
        };
        last.addEventListener("transitionend", fire, { once: true });
        window.setTimeout(fire, 900);
      } else {
        onEnd();
      }
    };

    if (prefersReduced) {
      revealedRef.current = true;
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(wrapper);

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => fit());
      ro.observe(wrapper);
    } catch {}
    const onFontsReady = () => fit();
    if (document.fonts?.ready) {
      document.fonts.ready.then(onFontsReady).catch(() => {});
    }
    fit();

    return () => {
      io.disconnect();
      ro?.disconnect();
    };
  }, [fit]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      style={
        {
          ["--fs" as string]: "clamp(2.75rem, 10vw, 11rem)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          width: "100%",
          maxWidth: "100%",
          overflow: "visible",
          boxSizing: "border-box",
          fontWeight: 600,
          letterSpacing: "-0.055em",
          lineHeight: 0.85,
          fontSize: "var(--fs)",
          userSelect: "none",
          color: "#ffffff",
          whiteSpace: "nowrap",
          textAlign: "center",
        } as React.CSSProperties
      }
    >
      {TEXT.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          data-letter=""
          style={{ display: "inline-block", willChange: "transform" } as React.CSSProperties}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}
