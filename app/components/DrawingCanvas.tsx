"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";

export type DrawingCanvasHandle = {
  toBlob: () => Promise<Blob | null>;
  clear: () => void;
  isEmpty: () => boolean;
};

const SIZE = 512; // internal resolution (square)

/** A simple finger/stylus drawing surface. Exports a PNG blob on demand. */
const DrawingCanvas = forwardRef<DrawingCanvasHandle, { className?: string }>(
  function DrawingCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const dirty = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [hasContent, setHasContent] = useState(false);

    // Prime the canvas with a white background (so the PNG is not transparent).
    useEffect(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#292524";
      ctx.lineWidth = 6;
    }, []);

    function pos(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * SIZE,
        y: ((e.clientY - rect.top) / rect.height) * SIZE,
      };
    }

    function start(e: React.PointerEvent<HTMLCanvasElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = pos(e);
    }

    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !last.current) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      if (!dirty.current) {
        dirty.current = true;
        setHasContent(true);
      }
    }

    function end() {
      drawing.current = false;
      last.current = null;
    }

    useImperativeHandle(ref, () => ({
      toBlob: () =>
        new Promise((resolve) => {
          const c = canvasRef.current;
          if (!c) return resolve(null);
          c.toBlob((b) => resolve(b), "image/png");
        }),
      clear: () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, SIZE, SIZE);
        dirty.current = false;
        setHasContent(false);
      },
      isEmpty: () => !hasContent,
    }));

    return (
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={`aspect-square w-full touch-none rounded-2xl bg-white ${
          className ?? ""
        }`}
        aria-label="Холст для рисования слова"
      />
    );
  },
);

export default DrawingCanvas;
