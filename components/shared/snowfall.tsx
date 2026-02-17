"use client";

import React, { useEffect, useRef } from "react";
import { useSnowfall } from "@/contexts/snowfall-context";

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  opacity: number;
}

export function Snowfall() {
  const { isSnowing } = useSnowfall();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isSnowing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let snowflakes: Snowflake[] = [];

    const createSnowflakes = () => {
      const count = Math.floor((window.innerWidth * window.innerHeight) / 10000);
      snowflakes = [];
      for (let i = 0; i < count; i++) {
        snowflakes.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 2 + 1,
          speed: Math.random() * 1 + 0.5,
          wind: Math.random() * 0.5 - 0.25,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createSnowflakes();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";

      snowflakes.forEach((snowflake) => {
        ctx.beginPath();
        ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
        ctx.globalAlpha = snowflake.opacity;
        ctx.fill();

        snowflake.y += snowflake.speed;
        snowflake.x += snowflake.wind;

        if (snowflake.y > canvas.height) {
          snowflake.y = -snowflake.radius;
          snowflake.x = Math.random() * canvas.width;
        }

        if (snowflake.x > canvas.width) {
          snowflake.x = 0;
        } else if (snowflake.x < 0) {
          snowflake.x = canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSnowing]);

  if (!isSnowing) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-30"
      aria-hidden="true"
    />
  );
}
