'use client';

import { useEffect, useRef, useState } from 'react';

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.maxLife = 80 + Math.random() * 60;
    this.life = this.maxLife;
    this.size = 1 + Math.random() * 2;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;

    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export default function AetherRibbonMesh({ embedded = false }: { embedded?: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (event?: MediaQueryListEvent) => {
      setIsDarkMode(event ? event.matches : mediaQuery.matches);
    };

    handleThemeChange();
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
    const particles: Particle[] = [];
    const clickRipple = { x: 0, y: 0, radius: 0, maxRadius: 400, speed: 14 };

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = root.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;

      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      if (x < 0 || x > width || y < 0 || y > height) {
        handlePointerLeave();
        return;
      }

      mouse.targetX = x - width / 2;
      mouse.targetY = y - height / 2;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
      mouse.active = false;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (x < 0 || x > width || y < 0 || y > height) return;

      clickRipple.x = x;
      clickRipple.y = y;
      clickRipple.radius = 0;

      const particleColor = isDarkMode ? 'rgba(37, 99, 235, 0.85)' : 'rgba(56, 189, 248, 0.85)';
      for (let index = 0; index < 30; index += 1) {
        particles.push(new Particle(clickRipple.x, clickRipple.y, particleColor));
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(root);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', handlePointerDown);

    let lastTime = performance.now();
    let time = 0;

    const noise = (x: number, t: number, o: number) =>
      (Math.sin(x * 0.0012 + t * 0.25 + o) + Math.cos(x * 0.0028 - t * 0.4 + o * 2)) / 2;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      time += dt * 0.85;

      const lerpFactor = 1 - Math.exp(-9 * dt);
      mouse.x += (mouse.targetX - mouse.x) * lerpFactor;
      mouse.y += (mouse.targetY - mouse.y) * lerpFactor;

      if (embedded) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = isDarkMode ? '#ffffff' : '#030712';
        ctx.fillRect(0, 0, width, height);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.update();
        particle.draw(ctx);

        if (particle.life <= 0) {
          particles.splice(index, 1);
        }
      }

      if (clickRipple.radius < clickRipple.maxRadius) {
        clickRipple.radius += clickRipple.speed;
      }

      const layers = [
        { ribbonCount: 16, step: 4, offsetMod: 0, freqScale: 0.0035, ampScale: 55, speedScale: 1.1, primary: true },
        { ribbonCount: 10, step: 6, offsetMod: 1.2, freqScale: 0.0075, ampScale: 30, speedScale: 0.7, primary: false },
      ];

      layers.forEach((layer) => {
        ctx.globalCompositeOperation = layer.primary ? 'source-over' : 'multiply';

        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        if (isDarkMode) {
          gradient.addColorStop(0, `rgba(37, 99, 235, ${layer.primary ? 0.15 : 0.03})`);
          gradient.addColorStop(0.5, `rgba(29, 78, 216, ${layer.primary ? 0.75 : 0.3})`);
          gradient.addColorStop(1, `rgba(109, 40, 217, ${layer.primary ? 0.15 : 0.03})`);
        } else {
          gradient.addColorStop(0, `rgba(56, 189, 248, ${layer.primary ? 0.1 : 0.02})`);
          gradient.addColorStop(0.5, `rgba(96, 165, 250, ${layer.primary ? 0.8 : 0.35})`);
          gradient.addColorStop(1, `rgba(168, 85, 247, ${layer.primary ? 0.1 : 0.02})`);
        }

        for (let ribbonIndex = 0; ribbonIndex < layer.ribbonCount; ribbonIndex += 1) {
          const ribbonProgress = ribbonIndex / layer.ribbonCount;
          const yOffset = height * 0.22 + ribbonIndex * (height * 0.032) + layer.offsetMod * 35;
          const baseAlpha = (1 - ribbonProgress * 0.75) * (isDarkMode ? 0.8 : 0.65);

          const rippleDistort =
            clickRipple.radius < clickRipple.maxRadius
              ? Math.sin((time * 2 + ribbonProgress * Math.PI) * 2) *
                ((clickRipple.maxRadius / Math.max(clickRipple.radius, 1)) * 2.5)
              : 0;

          ctx.beginPath();

          for (let x = 0; x <= width + layer.step; x += layer.step) {
            const edgeEnvelope = Math.sin((x / width) * Math.PI);
            const nFreq = 1 + noise(x, time, ribbonProgress) * 0.18;
            const nAmp = 1 + noise(x * 2, -time, ribbonProgress * 0.5) * 0.15;

            const wave1 =
              Math.sin(x * (layer.freqScale * nFreq) + time * layer.speedScale + ribbonIndex * 0.18) *
              (layer.ampScale * edgeEnvelope * nAmp);
            const wave2 = Math.cos(x * 0.008 - time * 0.7 + ribbonIndex * 0.1) * (20 * edgeEnvelope);
            const wave3 = Math.sin(x * 0.018 + time * 1.4) * (8 * edgeEnvelope);

            const cursorXWorld = width / 2 + mouse.x;
            const distToMouseX = Math.abs(x - cursorXWorld);
            const mouseRadius = layer.primary ? 380 : 220;
            const mouseFactor = Math.exp(-Math.pow(distToMouseX / mouseRadius, 2));
            const mouseDisplacement =
              Math.sin(x * 0.015 + time * 2.6) *
              (mouseFactor * (layer.primary ? 50 : 25) * edgeEnvelope);

            const rippleFactor = Math.exp(
              -Math.pow(Math.abs(distToMouseX - clickRipple.radius) / (25 + rippleDistort), 2),
            );
            const rippleDisplacement = rippleFactor * rippleDistort * (1.8 - ribbonProgress);

            const y =
              yOffset +
              wave1 +
              wave2 +
              wave3 +
              mouseDisplacement +
              rippleDisplacement +
              mouse.y * (ribbonProgress * 0.1);

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            if (layer.primary && x % 48 === 0) {
              ctx.fillStyle = isDarkMode ? 'rgba(29, 78, 216, 0.25)' : 'rgba(168, 85, 247, 0.3)';
              ctx.fillRect(x - 1, y - 1, 2, 2);
            }
          }

          ctx.globalAlpha = baseAlpha;
          ctx.strokeStyle = gradient;
          ctx.lineWidth = (layer.primary ? 1.4 : 0.8) + (1 - ribbonProgress) * 0.5;
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [embedded, isDarkMode]);

  return (
    <div
      ref={rootRef}
      className={`overflow-hidden select-none ${
        embedded
          ? 'pointer-events-none absolute inset-0'
          : `relative h-screen w-full ${isDarkMode ? 'bg-white' : 'bg-gray-950'}`
      }`}
      aria-label="Aether ribbon mesh background"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full cursor-default" />

      {!embedded && <div
        className={`pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-4 text-center mix-blend-difference ${
          isDarkMode ? 'text-black' : 'text-white'
        }`}
      >
        <span
          className={`mb-4 font-mono text-xs uppercase tracking-[0.3em] ${
            isDarkMode ? 'text-blue-700' : 'text-blue-400'
          }`}
        >
          AETHER
        </span>
        <h1 className="font-mono text-6xl font-black uppercase leading-none tracking-tighter md:text-8xl">
          AETHER
        </h1>
        <p className="mt-6 max-w-lg text-xs leading-relaxed opacity-75 md:text-sm">
          Superpositioned trigonometric ribbon meshes reactive to cursor deflection, noise modulation, and impulse force.
        </p>
      </div>}
    </div>
  );
}
