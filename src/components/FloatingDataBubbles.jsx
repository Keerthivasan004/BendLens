'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Floating Data Bubbles & Particles Canvas
 * Renders an ambient, interactive particle network of drifting data bubbles.
 * Adapts dynamically to Light (Pure White) and Dark (Pure Black) themes.
 */
export default function FloatingDataBubbles({ theme = 'dark' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle Configuration
    const particleCount = Math.min(Math.floor(window.innerWidth / 25), 55);
    const particles = [];

    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');

    // Palette: Cyan, Blue, Violet, Emerald
    const darkColors = [
      'rgba(56, 189, 248, ',  // Sky Blue
      'rgba(96, 165, 250, ',  // Blue
      'rgba(129, 140, 248, ', // Indigo
      'rgba(52, 211, 153, '   // Emerald
    ];

    const lightColors = [
      'rgba(30, 58, 138, ',   // Deep Blue
      'rgba(2, 132, 199, ',   // Cyan Blue
      'rgba(79, 70, 229, ',   // Indigo
      'rgba(13, 148, 136, '   // Teal
    ];

    const colors = isDark ? darkColors : lightColors;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3.5 + 1.5, // Tiny data bubble radius
        baseAlpha: Math.random() * 0.4 + 0.15,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.8) * 0.5 - 0.1, // Drifting upwards
        color: colors[Math.floor(Math.random() * colors.length)],
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseVal: Math.random() * Math.PI
      });
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw and update each data bubble
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.speedX;
        p.y += p.speedY;
        p.pulseVal += p.pulseSpeed;

        // Wrap around borders
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.1;
        const safeAlpha = Math.max(0.05, Math.min(0.6, currentAlpha));

        // Draw soft glow for bubble
        const glowRadius = p.radius * 2.5;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        grad.addColorStop(0, `${p.color}${safeAlpha})`);
        grad.addColorStop(0.5, `${p.color}${safeAlpha * 0.4})`);
        grad.addColorStop(1, `${p.color}0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw solid core bubble
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${safeAlpha * 1.5})`;
        ctx.fill();

        // Connect nearby bubbles with delicate neural data threads
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${p.color}${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
}
