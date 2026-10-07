"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import {
  CustomBlending,
  GLSL3,
  Mesh,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SrcAlphaFactor,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

const TOTAL_SIZE = 20.0;
const DOT_SIZE = 6.0;

const VERTEX_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec2 u_resolution;
  out vec2 fragCoord;

  void main() {
    gl_Position = vec4(position, 1.0);
    fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
    fragCoord.y = u_resolution.y - fragCoord.y;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  in vec2 fragCoord;

  uniform float u_time;
  uniform float u_opacities[10];
  uniform vec3 u_colors[6];
  uniform float u_total_size;
  uniform float u_dot_size;
  uniform vec2 u_resolution;

  out vec4 fragColor;

  float PHI = 1.61803398874989484820459;

  float random(vec2 xy) {
    return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
  }

  void main() {
    vec2 st = fragCoord.xy;
    st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
    st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

    float opacity = step(0.0, st.x) * step(0.0, st.y);

    vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

    float frequency = 5.0;
    float show_offset = random(st2);
    float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));

    opacity *= u_opacities[int(rand * 10.0)];
    opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
    opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

    vec3 color = u_colors[int(show_offset * 6.0)];

    float animation_speed_factor = 3.0;
    vec2 center_grid = u_resolution / 2.0 / u_total_size;
    float dist_from_center = distance(center_grid, st2);

    float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

    float current_timing_offset = timing_offset_intro;
    opacity *= step(current_timing_offset, u_time * animation_speed_factor);
    opacity *= clamp(
      (1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25,
      1.0,
      1.25
    );

    fragColor = vec4(color, opacity);
    fragColor.rgb *= fragColor.a;
  }
`;

const OPACITIES = [0.14, 0.14, 0.14, 0.24, 0.24, 0.24, 0.4, 0.4, 0.4, 0.62];

/**
 * Reads a CSS custom property and normalises any CSS colour notation
 * (including `oklch()`) into linear 0-1 floats using a canvas probe.
 */
function readColorRgb(varName: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return fallback;

  probe.fillStyle = "#000000";
  probe.fillStyle = raw;

  const normalised = probe.fillStyle;
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(normalised);
  const rgbMatch = /^rgba?\(([^)]+)\)$/i.exec(normalised);
  const parts = hexMatch
    ? [hexMatch[1].slice(0, 2), hexMatch[1].slice(2, 4), hexMatch[1].slice(4, 6)]
    : rgbMatch
      ? rgbMatch[1].split(",").slice(0, 3)
      : null;

  if (!parts || parts.length < 3) return fallback;

  const channels = parts.map((part) => parseInt(part.trim(), 16) / 255);
  if (channels.some((channel) => Number.isNaN(channel))) return fallback;

  return [channels[0], channels[1], channels[2]];
}

function mix(from: [number, number, number], to: [number, number, number], amount: number) {
  return new Vector3(
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  );
}

export interface DotFieldCanvasProps {
  className?: string;
}

/**
 * Decorative WebGL dot field. Falls back to a static CSS grid when WebGL is
 * unavailable, and renders a single settled frame when the user prefers
 * reduced motion.
 */
export function DotFieldCanvas({ className }: DotFieldCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let active = true;
    let renderer: WebGLRenderer | null = null;
    let geometry: PlaneGeometry | null = null;
    let material: ShaderMaterial | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let frameId = 0;
    let themeObserver: MutationObserver | null = null;

    let rendererRef: WebGLRenderer | null = null;
    let uniformsRef: { u_time: { value: number }; u_resolution: { value: Vector2 } } | null = null;
    let colorTargetsRef: { u_colors: { value: Vector3[] } } | null = null;

    const buildColors = () => {
      if (!colorTargetsRef) return;
      const muted = readColorRgb("--foreground-muted", [0.62, 0.62, 0.64]);
      const primary = readColorRgb("--foreground-primary", [0.17, 0.17, 0.18]);
      colorTargetsRef.u_colors.value = [
        mix(muted, primary, 0.15),
        mix(muted, primary, 0.35),
        mix(muted, primary, 0.55),
        mix(muted, primary, 0.75),
        mix(muted, primary, 0.9),
        new Vector3(primary[0], primary[1], primary[2]),
      ];
    };

    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new Scene();
      const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new Vector2(1, 1) },
        u_opacities: { value: OPACITIES },
        u_colors: { value: Array.from({ length: 6 }, () => new Vector3(0.6, 0.6, 0.62)) },
        u_total_size: { value: TOTAL_SIZE },
        u_dot_size: { value: DOT_SIZE },
      };

      buildColors();

      material = new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms,
        glslVersion: GLSL3,
        blending: CustomBlending,
        blendSrc: SrcAlphaFactor,
        blendDst: OneFactor,
        transparent: true,
      });

      geometry = new PlaneGeometry(2, 2);
      scene.add(new Mesh(geometry, material));

      rendererRef = renderer;
      uniformsRef = uniforms;
      colorTargetsRef = uniforms;

      const resize = () => {
        if (!rendererRef || !active) return;
        const width = canvas.clientWidth || 1;
        const height = canvas.clientHeight || 1;
        rendererRef.setSize(width, height, false);
        if (uniformsRef) uniformsRef.u_resolution.value.set(width, height);
      };

      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      const startTime = performance.now();

      const renderFrame = (now: number) => {
        if (!rendererRef || !uniformsRef) return;
        uniformsRef.u_time.value = (now - startTime) / 1000;
        rendererRef.render(scene, camera);
      };

      if (reducedMotion) {
        // Settle the intro so every dot is fully revealed, then stop animating.
        if (uniformsRef) uniformsRef.u_time.value = 999;
        renderFrame(performance.now());
      } else {
        const animate = (now: number) => {
          if (!active) return;
          frameId = requestAnimationFrame(animate);
          renderFrame(now);
        };
        frameId = requestAnimationFrame(animate);
      }

      themeObserver = new MutationObserver(buildColors);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    } catch {
      queueMicrotask(() => setFailed(true));
    }

    return () => {
      active = false;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      rendererRef = null;
      uniformsRef = null;
      colorTargetsRef = null;
    };
  }, [reducedMotion]);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle,var(--foreground-muted)_1px,transparent_1px)] [background-size:20px_20px] ${className ?? ""}`}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    />
  );
}

export default DotFieldCanvas;