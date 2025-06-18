"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 35,
  speed = "fast",
  waveOpacity = 0.5,
  intensity = "strong",
  showParticles = true,
  ...props
}: {
  children?: any;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  intensity?: "subtle" | "medium" | "strong";
  showParticles?: boolean;
  [key: string]: any;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const MINIMUM_BEAMS = 20;

  interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    hue: number;
    pulse: number;
    pulseSpeed: number;
  }

  interface Particle {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    hue: number;
    drift: number;
    driftSpeed: number;
  }

  const opacityMap = {
    subtle: 0.7,
    medium: 0.85,
    strong: 1,
  };

  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.3;
      case "fast":
        return 0.8;
      default:
        return 0.5;
    }
  };

  function createParticle(width: number, height: number): Particle {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2,
      speed: 0.2 + Math.random() * 0.3,
      opacity: 0.1 + Math.random() * 0.3,
      hue: colors ? Math.floor(Math.random() * 360) : 190 + Math.random() * 70,
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 0.01 + Math.random() * 0.02,
    };
  }

  function createBeam(width: number, height: number): Beam {
    const angle = -35 + Math.random() * 10;
    return {
      x: Math.random() * width * 1.5 - width * 0.25,
      y: Math.random() * height * 1.5 - height * 0.25,
      width: 30 + Math.random() * 60,
      length: height * 2.5,
      angle: angle,
      speed: getSpeed() + Math.random() * 0.4,
      opacity: (waveOpacity || 0.5) * 0.4 + Math.random() * 0.16,
      hue: colors ? Math.floor(Math.random() * 360) : 190 + Math.random() * 70,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03,
    };
  }

  function resetBeam(beam: Beam, index: number, totalBeams: number) {
    const canvas = canvasRef.current;
    if (!canvas) return beam;

    const column = index % 3;
    const spacing = canvas.width / 3;

    beam.y = canvas.height + 100;
    beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
    beam.width = (waveWidth || 100) + Math.random() * 100;
    beam.speed = getSpeed() + Math.random() * 0.4;
    beam.hue = colors ? Math.floor(Math.random() * 360) : 190 + (index * 70) / totalBeams;
    beam.opacity = (waveOpacity || 0.5) * 0.4 + Math.random() * 0.1;
    return beam;
  }

  function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
    ctx.save();
    ctx.translate(beam.x, beam.y);
    ctx.rotate((beam.angle * Math.PI) / 180);

    const pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity];

    const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

    if (colors && colors.length > 0) {
      const color = colors[Math.floor(beam.hue / 360 * colors.length)];
      gradient.addColorStop(0, `${color}00`);
      gradient.addColorStop(0.1, `${color}${Math.floor(pulsingOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.4, `${color}${Math.floor(pulsingOpacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.6, `${color}${Math.floor(pulsingOpacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.9, `${color}${Math.floor(pulsingOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${color}00`);
    } else {
      gradient.addColorStop(0, `hsla(${beam.hue}, 85%, 65%, 0)`);
      gradient.addColorStop(0.1, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(0.4, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`);
      gradient.addColorStop(0.6, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`);
      gradient.addColorStop(0.9, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${beam.hue}, 85%, 65%, 0)`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
    ctx.restore();
  }

  function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
    ctx.save();
    
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * 2
    );
    
    if (colors && colors.length > 0) {
      const color = colors[Math.floor(particle.hue / 360 * colors.length)];
      gradient.addColorStop(0, `${color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${color}00`);
    } else {
      gradient.addColorStop(0, `hsla(${particle.hue}, 85%, 65%, ${particle.opacity})`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 85%, 65%, 0)`);
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `blur(${blur}px)`;

    // Draw beams
    const totalBeams = beamsRef.current.length;
    beamsRef.current.forEach((beam, index) => {
      beam.y -= beam.speed;
      beam.pulse += beam.pulseSpeed;

      if (beam.y + beam.length < -100) {
        resetBeam(beam, index, totalBeams);
      }

      drawBeam(ctx, beam);
    });

    // Draw particles
    if (showParticles) {
      particlesRef.current.forEach((particle) => {
        particle.y -= particle.speed;
        particle.drift += particle.driftSpeed;
        particle.x += Math.sin(particle.drift) * 0.5;

        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }

        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;

        drawParticle(ctx, particle);
      });
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      const totalBeams = MINIMUM_BEAMS * 1.5;
      beamsRef.current = Array.from({ length: totalBeams }, () => 
        createBeam(canvas.width, canvas.height)
      );

      // Create floating particles
      if (showParticles) {
        const particleCount = Math.floor((canvas.width * canvas.height) / 25000);
        particlesRef.current = Array.from({ length: particleCount }, () =>
          createParticle(canvas.width, canvas.height)
        );
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    animate();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [blur, speed, waveOpacity, intensity, colors, waveWidth, showParticles]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden",
        containerClassName
      )}
      style={{
        background: backgroundFill || "#0a0a0a",
      }}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0" 
        style={{
          filter: `blur(${blur}px)`,
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }} 
      />

      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{
          duration: 10,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        style={{
          background: backgroundFill || "#0a0a0a",
          opacity: 0.1,
          backdropFilter: "blur(50px)",
        }}
      />

      <div className={cn("relative z-10 flex h-screen w-full items-center justify-center", className)} {...props}>
        {children}
      </div>
    </div>
  );
};