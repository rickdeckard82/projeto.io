import { useEffect, useRef } from 'react';
import { hexToRgb } from '../../lib/hexToRgb';

const DIST = 45;
const SPEED = 0.3;
const DENSITY = 0.0015;
const MIN_POINTS = 20;
const MAX_POINTS = 120;

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function PolygonBackground({ color = '#6366F1' }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rgbRef = useRef(hexToRgb(color));

  useEffect(() => {
    rgbRef.current = hexToRgb(color);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const points: Point[] = [];

    function seedPoints() {
      const count = Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.floor(w * h * DENSITY)));
      points.length = 0;
      for (let i = 0; i < count; i++) {
        points.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
        });
      }
    }

    function resize() {
      w = canvas!.width = parent!.clientWidth;
      h = canvas!.height = parent!.clientHeight;
      seedPoints();
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const rgb = rgbRef.current;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= w) p.vx *= -0.9;
        if (p.y <= 0 || p.y >= h) p.vy *= -0.9;

        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.hypot(dx, dy);
          if (d < DIST) {
            ctx!.strokeStyle = `rgba(${rgb}, ${(1 - d / DIST) * 0.6})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
