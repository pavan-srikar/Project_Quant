import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useColorPickerContext } from "../color-picker/ColorPickerContext";
import { RgbPickerPanel } from "../color-picker/RgbPickerPanel";

export interface ColorPickerOverlayProps {
  modalRef?: React.RefObject<HTMLDivElement | null>;
}

export function ColorPickerOverlay({ modalRef }: ColorPickerOverlayProps) {
  const [sidePosition, setSidePosition] = useState<"right" | "left">("right");
  const colorContext = useColorPickerContext();
  const activeTarget = colorContext?.activeTarget;
  const closePicker = colorContext?.closePicker ?? (() => {});

  useEffect(() => {
    if (!activeTarget || !modalRef?.current) return;
    const checkSpace = () => {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        if (rect.right + 300 > window.innerWidth && rect.left > 300) {
          setSidePosition("left");
        } else {
          setSidePosition("right");
        }
      }
    };
    checkSpace();
    window.addEventListener("resize", checkSpace);
    return () => window.removeEventListener("resize", checkSpace);
  }, [activeTarget, modalRef]);

  if (!activeTarget) return null;

  return (
    <>
      {/* Side Panel for screens >= 768px (Desktop/Tablet) */}
      <div
        className={cn(
          "hidden md:block absolute top-0 z-50 animate-in fade-in duration-150",
          sidePosition === "right" ? "left-[calc(100%+14px)]" : "right-[calc(100%+14px)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <RgbPickerPanel
          label={activeTarget.label}
          value={activeTarget.value}
          onChange={(val) => {
            activeTarget.onChange(val);
            colorContext?.updateValue(val);
          }}
          onClose={closePicker}
        />
      </div>

      {/* Floating Center Overlay for screens < 768px (Mobile) */}
      <div
        className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in"
        onClick={(e) => {
          e.stopPropagation();
          closePicker();
        }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <RgbPickerPanel
            label={activeTarget.label}
            value={activeTarget.value}
            onChange={(val) => {
              activeTarget.onChange(val);
              colorContext?.updateValue(val);
            }}
            onClose={closePicker}
          />
        </div>
      </div>
    </>
  );
}
