"use client";

import * as React from "react";
import { Database, FileText, ShieldCheck } from "lucide-react";
import "./hero-card.css";

type Props = {
  snapshot?: unknown;
  reducedMotion?: boolean;
};

function FloatingNode({
  icon: Icon,
  title,
  subtitle,
  className,
  delay,
  reducedMotion,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  className: string;
  delay: number;
  reducedMotion: boolean;
}) {
  return (
    <div
      className={`hero-float-node ${className}`}
      style={reducedMotion ? undefined : { animationDelay: `${delay}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="hero-float-node__icon">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="hero-float-node__text">
        <span className="hero-float-node__title">{title}</span>
        <span className="hero-float-node__subtitle">{subtitle}</span>
      </span>
    </div>
  );
}

export function HeroCard3D({ reducedMotion = false }: Props) {
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const rigRef = React.useRef<HTMLDivElement | null>(null);

  const onMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const el = stageRef.current;
      const rig = rigRef.current;
      if (!el || !rig) return;
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const ry = -14 + (x - 0.5) * 18;
      const rx = 5 - (y - 0.5) * 12;
      rig.style.setProperty("--ry", `${ry}deg`);
      rig.style.setProperty("--rx", `${rx}deg`);
      rig.style.setProperty("--sx", `${x * 100}%`);
      rig.style.setProperty("--sy", `${y * 100}%`);
    },
    [reducedMotion],
  );

  const onLeave = React.useCallback(() => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.style.removeProperty("--ry");
    rig.style.removeProperty("--rx");
    rig.style.removeProperty("--sx");
    rig.style.removeProperty("--sy");
  }, []);

  return (
    <div
      ref={stageRef}
      className="hero-card-stage"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-hidden="false"
    >
      <FloatingNode
        icon={FileText}
        title="Analyze Prompt"
        subtitle="Inspect intent"
        className="hero-float-node--tl"
        delay={200}
        reducedMotion={reducedMotion}
      />
      <FloatingNode
        icon={ShieldCheck}
        title="Detect Threats"
        subtitle="Score risk"
        className="hero-float-node--tr"
        delay={400}
        reducedMotion={reducedMotion}
      />
      <FloatingNode
        icon={Database}
        title="Enforce Policies"
        subtitle="Allow · Block"
        className="hero-float-node--br"
        delay={600}
        reducedMotion={reducedMotion}
      />

      <div className="hero-card__connectors" aria-hidden="true">
        <svg viewBox="0 0 560 420" fill="none" className="hero-card__connectorSvg">
          <path d="M 108 88 C 180 110, 220 140, 260 170" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <path d="M 452 72 C 400 110, 360 140, 310 170" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <path d="M 448 340 C 400 310, 350 280, 310 260" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
        </svg>
      </div>

      <div ref={rigRef} className={reducedMotion ? "hero-card-rig hero-card-rig--still" : "hero-card-rig"}>
        <div className="hero-card__edge hero-card__edge--back2" aria-hidden="true" />
        <div className="hero-card__edge hero-card__edge--back1" aria-hidden="true" />
        <div className="hero-card__shadow" aria-hidden="true" />

        <div className="hero-card">
          <div className="hero-card__sheen" aria-hidden="true" />

          <div className="hero-card__header hero-card__header--dashboard">
            <div>
              <p className="hero-card__brand">PROMPTSHIELD</p>
              <p className="hero-card__subtitle">Security decision</p>
            </div>
            <div className="hero-card__risk">
              <span className="hero-card__riskLabel">Risk Score</span>
              <span className="hero-card__riskValue">72<span className="hero-card__riskDenom">/100</span></span>
            </div>
          </div>

          <div className="hero-card__bubble hero-card__bubble--prompt">
            <p className="hero-card__label">USER PROMPT</p>
            <p className="hero-card__promptText">“Summarize this article in three bullet points.”</p>
          </div>

          <div className="hero-card__bubble hero-card__bubble--guard">
            <p className="hero-card__label">AI GUARD</p>
            <p className="hero-card__guardText">“Here are the policies applying to this request. The result is safe.”</p>
          </div>

          <div className="hero-card__steps" role="list" aria-label="Security decision steps">
            <div className="hero-card__step hero-card__step--on" role="listitem">
              <span className="hero-card__stepNum">01</span>
              <span className="hero-card__stepLabel">Prompt analyzed</span>
              <span className="hero-card__stepMeta">Safe intent</span>
            </div>
            <div className="hero-card__step hero-card__step--on" role="listitem">
              <span className="hero-card__stepNum">02</span>
              <span className="hero-card__stepLabel">Threat detection</span>
              <span className="hero-card__stepMeta">No threats found</span>
            </div>
            <div className="hero-card__step hero-card__step--on" role="listitem">
              <span className="hero-card__stepNum">03</span>
              <span className="hero-card__stepLabel">Policy applied</span>
              <span className="hero-card__stepMeta hero-card__stepMeta--allowed">Allowed</span>
            </div>
          </div>

          <div className="hero-card__sanitized">
            <p className="hero-card__label">SANITIZED PROMPT (IF NEEDED)</p>
            <p className="hero-card__sanitizedValue">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}
