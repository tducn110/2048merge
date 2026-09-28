import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { FloatingNotification } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isStar?: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
  isSquare?: boolean;
  width?: number;
  height?: number;
}

export interface ParticleCanvasHandle {
  emitMergeParticles: (x: number, y: number, color: string, count?: number) => void;
  emitSquareExplosion: (x: number, y: number, width: number, height: number, color: string) => void;
  emitTripleBeam: (x: number, y: number, isVertical: boolean, color: string) => void;
}

interface ParticleCanvasProps {
  notifications: FloatingNotification[];
  onRemoveNotification: (id: string) => void;
}

export const ParticleCanvas = forwardRef<ParticleCanvasHandle, ParticleCanvasProps>(
  ({ notifications, onRemoveNotification }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const shockwavesRef = useRef<Shockwave[]>([]);
    const animIdRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      emitMergeParticles: (x, y, color, count = 24) => {
        const particles = particlesRef.current;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            size: Math.random() * 4 + 2,
            color,
            alpha: 1,
            life: 0,
            maxLife: Math.random() * 25 + 25,
            isStar: Math.random() > 0.6,
          });
        }
        // Add shockwave
        shockwavesRef.current.push({
          x,
          y,
          radius: 10,
          maxRadius: 65,
          color,
          alpha: 0.9,
          lineWidth: 4,
        });
      },

      emitSquareExplosion: (x, y, width, height, color) => {
        const particles = particlesRef.current;
        // Emit golden glitter from edges of square
        for (let i = 0; i < 48; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 7 + 3;
          particles.push({
            x: x + (Math.random() - 0.5) * width,
            y: y + (Math.random() - 0.5) * height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: Math.random() * 6 + 3,
            color: i % 2 === 0 ? '#facc15' : color,
            alpha: 1,
            life: 0,
            maxLife: Math.random() * 35 + 30,
            isStar: true,
          });
        }
        // Square shockwave
        shockwavesRef.current.push({
          x,
          y,
          radius: 0,
          maxRadius: Math.max(width, height) * 1.3,
          color: '#facc15',
          alpha: 1,
          lineWidth: 5,
          isSquare: true,
          width,
          height,
        });
      },

      emitTripleBeam: (x, y, isVertical, color) => {
        const particles = particlesRef.current;
        const count = 36;
        for (let i = 0; i < count; i++) {
          const spread = (Math.random() - 0.5) * 80;
          particles.push({
            x: isVertical ? x + (Math.random() - 0.5) * 20 : x + spread,
            y: isVertical ? y + spread : y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            size: Math.random() * 5 + 3,
            color: i % 2 === 0 ? '#38bdf8' : color,
            alpha: 1,
            life: 0,
            maxLife: 35,
            isStar: true,
          });
        }
        // Shockwave
        shockwavesRef.current.push({
          x,
          y,
          radius: 8,
          maxRadius: 75,
          color: '#a855f7',
          alpha: 1,
          lineWidth: 4,
        });
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleResize = () => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
      };

      handleResize();
      window.addEventListener('resize', handleResize);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        // Render Shockwaves
        const shockwaves = shockwavesRef.current;
        for (let i = shockwaves.length - 1; i >= 0; i--) {
          const sw = shockwaves[i];
          sw.radius += 2.8;
          sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

          if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
            shockwaves.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = sw.alpha;
          ctx.lineWidth = sw.lineWidth;

          if (sw.isSquare && sw.width && sw.height) {
            const grow = sw.radius * 0.8;
            ctx.strokeRect(
              sw.x - (sw.width + grow) / 2,
              sw.y - (sw.height + grow) / 2,
              sw.width + grow,
              sw.height + grow
            );
          } else {
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Render Particles
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12; // gravity
          p.vx *= 0.96; // friction
          p.life++;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);

          if (p.life >= p.maxLife || p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;

          if (p.isStar) {
            // Draw star/diamond
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - p.size);
            ctx.lineTo(p.x + p.size * 0.7, p.y);
            ctx.lineTo(p.x, p.y + p.size);
            ctx.lineTo(p.x - p.size * 0.7, p.y);
            ctx.closePath();
            ctx.fill();
          } else {
            // Draw juicy water droplet with light reflection
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.beginPath();
            ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.restore();
        animIdRef.current = requestAnimationFrame(render);
      };

      animIdRef.current = requestAnimationFrame(render);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      };
    }, []);

    return (
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Render animated HTML Floating Text for crisp UI badges */}
        {notifications.map((notif) => (
          <div
            key={notif.id}
            onAnimationEnd={() => onRemoveNotification(notif.id)}
            style={{
              left: `${notif.x}px`,
              top: `${notif.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute flex flex-col items-center pointer-events-none animate-[floatUp_1.3s_cubic-bezier(0.16,1,0.3,1)_forwards] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]`}
          >
            <span
              className={`font-black tracking-wider text-center ${
                notif.type === 'square'
                  ? 'text-yellow-300 text-lg sm:text-xl font-extrabold bg-slate-950/90 px-3 py-1 rounded-full border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                  : notif.type === 'triple'
                  ? 'text-cyan-300 text-base sm:text-lg font-extrabold bg-slate-950/90 px-3 py-1 rounded-full border-2 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.8)]'
                  : notif.type === 'combo'
                  ? 'text-rose-300 text-base font-bold bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-rose-400'
                  : 'text-white text-base sm:text-lg font-black'
              }`}
            >
              {notif.text}
            </span>
            {notif.subtext && (
              <span className="text-xs font-semibold text-yellow-200/90 bg-slate-950/70 px-2 py-0.5 rounded-md mt-0.5">
                {notif.subtext}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
);
