import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const COLORS = ['--color-primary', '--color-coral', '--color-yellow', '--color-mint', '--color-ink'];
const PIECES = 160;
const FRAMES = 150;

/** A one-off confetti burst in the palette (canvas, no dependency). Nothing with reduced motion. */
export const Confetti = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (reduced || !element || !context) return;
    const { innerWidth: width, innerHeight: height, devicePixelRatio: ratio = 1 } = window;
    element.width = width * ratio;
    element.height = height * ratio;
    context.scale(ratio, ratio);
    const style = getComputedStyle(document.documentElement);
    const colors = COLORS.map((name) => style.getPropertyValue(name).trim());
    const pieces = Array.from({ length: PIECES }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = (0.012 + Math.random() * 0.02) * height;
      return {
        x: width / 2,
        y: height * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 0.4,
        turn: Math.random() * Math.PI,
        size: 8 + Math.random() * 8,
        color: colors[i % colors.length],
      };
    });
    let frame = 0;
    let request = 0;
    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(0, 1 - frame / FRAMES);
      for (const piece of pieces) {
        piece.vx *= 0.985;
        piece.vy = piece.vy * 0.985 + height * 0.0009;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.turn += piece.spin;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.turn);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (++frame < FRAMES) request = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 size-full" />;
};
