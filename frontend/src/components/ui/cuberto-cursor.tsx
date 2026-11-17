"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

export function CubertoCursor() {
  const reducedMotion = useReducedMotion();
  const cursorRef = React.useRef<HTMLDivElement>(null);
  const dotRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Disable on reduced motion, touch devices, or when hover is not supported
    if (reducedMotion) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none) or (pointer: coarse)").matches) return;

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let dotX = -100;
    let dotY = -100;
    let isVisible = false;
    let isHovering = false;
    let isClicking = false;
    let isInput = false;
    let magneticTarget: HTMLElement | null = null;
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        cursor.style.opacity = "1";
        dot.style.opacity = "1";
      }

      // Check what element is under the cursor
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'button, a, [role="button"], [role="tab"], input[type="submit"], [data-cursor-hover], .hover-lift'
      );
      isHovering = Boolean(interactive);

      // Check if magnetic
      const magnetic = target.closest<HTMLElement>("[data-cursor-magnetic]");
      magneticTarget = magnetic;

      const input = target.closest("input, textarea, select, [contenteditable='true']");
      isInput = Boolean(input);
    };

    const onMouseDown = () => {
      isClicking = true;
    };

    const onMouseUp = () => {
      isClicking = false;
    };

    const onMouseLeave = () => {
      isVisible = false;
      cursor.style.opacity = "0";
      dot.style.opacity = "0";
    };

    const onMouseEnter = () => {
      isVisible = true;
      cursor.style.opacity = "1";
      dot.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });
    document.addEventListener("mouseenter", onMouseEnter, { passive: true });

    // Smooth RAF animation loop for physics lerp
    const tick = () => {
      if (isVisible) {
        let destX = mouseX;
        let destY = mouseY;

        // Subtle magnetic pull toward button center if magnetic
        if (magneticTarget) {
          const rect = magneticTarget.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          destX = destX + (centerX - destX) * 0.35;
          destY = destY + (centerY - destY) * 0.35;
        }

        // Fluid spring lerp
        dotX += (destX - dotX) * 0.55;
        dotY += (destY - dotY) * 0.55;
        ringX += (destX - ringX) * 0.15;
        ringY += (destY - ringY) * 0.15;

        dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%) scale(${
          isInput ? 0 : isClicking ? 0.7 : isHovering ? 0.3 : 1
        })`;

        const ringScale = isInput
          ? 0
          : isClicking
          ? 1.5
          : isHovering
          ? 1.9
          : 1;

        cursor.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale})`;
        cursor.style.borderColor = isHovering
          ? "rgba(255, 255, 255, 0.85)"
          : "rgba(255, 255, 255, 0.4)";
        cursor.style.backgroundColor = isHovering
          ? "rgba(255, 255, 255, 0.12)"
          : "transparent";
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none"
    >
      {/* Outer fluid lag ring */}
      <div
        ref={cursorRef}
        className="pointer-events-none absolute left-0 top-0 h-9 w-9 rounded-full border border-white/40 opacity-0 transition-opacity duration-300 ease-out will-change-transform mix-blend-difference backdrop-blur-[0.5px]"
      />
      {/* Precision center dot */}
      <div
        ref={dotRef}
        className="pointer-events-none absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white opacity-0 transition-opacity duration-300 ease-out will-change-transform mix-blend-difference"
      />
    </div>
  );
}
