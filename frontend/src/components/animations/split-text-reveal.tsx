"use client"

import * as React from "react"
import { useReducedMotion } from "framer-motion"
import { gsap, ScrollTrigger, SplitText } from "@/lib/animations/gsap"

type SplitType = "words" | "lines" | "chars"

type SplitTextRevealProps = {
  children: React.ReactNode
  className?: string
  type?: SplitType
  trigger?: boolean | string | Element | null
  start?: string
  delay?: number
  duration?: number
  stagger?: number
  y?: number
  once?: boolean
  as?: React.ElementType
}

export function SplitTextReveal({
  children,
  className,
  type = "words",
  trigger = true,
  start = "top 85%",
  delay = 0,
  duration = 1,
  stagger = 0.06,
  y = 56,
  once = true,
  as = "div",
}: SplitTextRevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const reducedMotion = useReducedMotion()

  React.useLayoutEffect(() => {
    const element = ref.current

    if (!element || typeof window === "undefined") {
      return
    }

    if (reducedMotion) {
      element.style.opacity = "1"
      element.style.transform = "none"
      element.style.filter = "none"
      return
    }

    const cleanup = gsap.context(() => {
      const split = new SplitText(element, {
        type,
        wordsClass: "split-text-word",
        charsClass: "split-text-char",
        linesClass: "split-text-line",
        reduceWhiteSpace: false,
      })

      const targets =
        type === "chars" ? split.chars : type === "lines" ? split.lines : split.words

      if (!targets || targets.length === 0) {
        return
      }

      const revealTarget =
        typeof trigger === "string"
          ? document.querySelector(trigger)
          : trigger instanceof Element
            ? trigger
            : element

      gsap.set(targets, {
        opacity: 0,
        y,
        willChange: "opacity, transform",
        display: type === "lines" ? "block" : "inline-block",
      })

      const animation = gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        delay,
        ease: "power3.out",
        clearProps: "transform,opacity,filter",
      })

      if (trigger === false) {
        return
      }

      ScrollTrigger.create({
        trigger: revealTarget,
        start,
        once,
        invalidateOnRefresh: true,
        animation,
      })
    }, element)

    return () => {
      cleanup.revert()
      if (element) {
        element.style.opacity = ""
        element.style.transform = ""
        element.style.filter = ""
      }
    }
  }, [delay, duration, once, reducedMotion, stagger, start, trigger, type, y])

  const Component = as as React.ElementType

  return React.createElement(Component, { ref, className }, children)
}
