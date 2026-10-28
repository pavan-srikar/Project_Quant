import React, { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import {
  parseColor,
  formatColor,
  rgbToHsv,
  hsvToRgb,
} from "../../lib/colorUtils.ts";

export interface RgbPickerPanelProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  onClose?: () => void;
  className?: string;
}

export function RgbPickerPanel({
  value,
  onChange,
  label,
  onClose,
  className,
}: RgbPickerPanelProps) {
  const spectrumRef = useRef<HTMLDivElement>(null);

  // Parse initial color
  const parsed = parseColor(value);
  const initialHsv = rgbToHsv(parsed.r, parsed.g, parsed.b);

  // Dedicated reactive state for smooth 60fps tracking
  const [hue, setHue] = useState<number>(initialHsv.s > 0.02 ? initialHsv.h : 220);
  const [sat, setSat] = useState<number>(initialHsv.s);
  const [val, setVal] = useState<number>(initialHsv.v);
  const [alpha, setAlpha] = useState<number>(parsed.a);
  const [inputText, setInputText] = useState<string>(value);

  const lastEmittedRef = useRef<string>(value);

  // Sync state when value changes externally (e.g. clicking different slot or preset)
  useEffect(() => {
    if (value && value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      const p = parseColor(value);
      const hsv = rgbToHsv(p.r, p.g, p.b);
      if (hsv.s > 0.02) {
        setHue(hsv.h);
      }
      setSat(hsv.s);
      setVal(hsv.v);
      setAlpha(p.a);
      setInputText(value);
    }
  }, [value]);

  const emitColor = useCallback(
    (h: number, s: number, v: number, a: number) => {
      const rgb = hsvToRgb(h, s, v);
      const col = formatColor(rgb.r, rgb.g, rgb.b, a);
      lastEmittedRef.current = col;
      setInputText(col);
      onChange(col);
    },
    [onChange],
  );

  const checkerboardStyle: React.CSSProperties = {
    backgroundImage: `repeating-conic-gradient(#363a45 0% 25%, #1e222d 0% 50%)`,
    backgroundSize: "8px 8px",
  };

  // 2D Spectrum Pointer Handler
  const handleSpectrumPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = spectrumRef.current;
    if (!el) return;

    const updateFromCoords = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const newS = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newV = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      setSat(newS);
      setVal(newV);
      emitColor(hue, newS, newV, alpha);
    };

    updateFromCoords(e.clientX, e.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromCoords(ev.clientX, ev.clientY);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleHueChange = (newH: number) => {
    setHue(newH);
    emitColor(newH, sat, val, alpha);
  };

  const handleOpacityChange = (newPercent: number) => {
    const newAlpha = Math.max(0, Math.min(1, newPercent / 100));
    setAlpha(newAlpha);
    emitColor(hue, sat, val, newAlpha);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const txt = e.target.value;
    setInputText(txt);
    const p = parseColor(txt);
    const hsv = rgbToHsv(p.r, p.g, p.b);
    if (hsv.s > 0.02) {
      setHue(hsv.h);
    }
    setSat(hsv.s);
    setVal(hsv.v);
    setAlpha(p.a);
    lastEmittedRef.current = txt;
    onChange(txt);
  };

  // Current RGB for preview swatch and handle background
  const currentRgb = hsvToRgb(hue, sat, val);
  const currentHex = formatColor(currentRgb.r, currentRgb.g, currentRgb.b, 1);
  const currentFormatted = formatColor(currentRgb.r, currentRgb.g, currentRgb.b, alpha);
  const opacityPercent = Math.round(alpha * 100);

  return (
    <div
      className={`w-72 bg-[#0c0e14] border border-[#363a45] ring-1 ring-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3.5 text-xs select-none space-y-3 ${
        className ?? ""
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title and Close button */}
      <div className="flex items-center justify-between text-neutral-300 font-medium pb-2 border-b border-[#2a2e39]/70">
        <span className="text-[11px] font-bold tracking-wide uppercase text-neutral-200 truncate max-w-[210px]">
          {label || "RGB & Opacity Picker"}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2D Spectrum Area (Saturation & Value) */}
      <div
        ref={spectrumRef}
        onPointerDown={handleSpectrumPointerDown}
        className="w-full h-36 rounded-lg relative cursor-crosshair overflow-hidden touch-none shadow-inner border border-black/40"
        style={{
          backgroundColor: `hsl(${hue}, 100%, 50%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, #fff, transparent)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, #000, transparent)",
          }}
        />
        {/* Draggable Circle Handle */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.8)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${sat * 100}%`,
            top: `${(1 - val) * 100}%`,
            backgroundColor: currentHex,
          }}
        />
      </div>

      {/* Hue Rainbow Slider */}
      <div className="space-y-1">
        <div className="text-[10px] text-neutral-400 font-medium">Hue</div>
        <div
          className="rounded-md h-4 relative overflow-hidden shadow-inner border border-black/30"
          style={{
            background:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        >
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => handleHueChange(Number(e.target.value))}
            className="w-full h-full opacity-0 cursor-pointer absolute inset-0 m-0 z-10"
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-0 bottom-0 w-3 rounded bg-white border border-black/40 shadow pointer-events-none -translate-x-1/2"
            style={{ left: `${(hue / 360) * 100}%` }}
          />
        </div>
      </div>

      {/* Opacity / Alpha Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
          <span>Opacity</span>
          <span className="font-mono text-neutral-200">{opacityPercent}%</span>
        </div>
        <div
          className="rounded-md h-4 relative overflow-hidden shadow-inner border border-black/30"
          style={checkerboardStyle}
        >
          <div
            className="w-full h-full rounded"
            style={{
              background: `linear-gradient(to right, transparent, ${currentHex})`,
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={opacityPercent}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            className="w-full h-full opacity-0 cursor-pointer absolute inset-0 m-0 z-10"
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-0 bottom-0 w-3 rounded bg-white border border-black/40 shadow pointer-events-none -translate-x-1/2"
            style={{ left: `${opacityPercent}%` }}
          />
        </div>
      </div>

      {/* Preview Swatch, Text Input, and Done Button (All contained cleanly) */}
      <div className="flex items-center gap-2 pt-1.5 border-t border-[#2a2e39]/60">
        <div
          className="w-8 h-8 rounded-lg border border-[#363a45] overflow-hidden shadow-inner shrink-0"
          style={checkerboardStyle}
        >
          <div className="w-full h-full" style={{ backgroundColor: currentFormatted }} />
        </div>
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#161a25] border border-[#363a45] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
          placeholder="#2962ff or rgba(...)"
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e54e4] text-white text-xs font-semibold shadow transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
