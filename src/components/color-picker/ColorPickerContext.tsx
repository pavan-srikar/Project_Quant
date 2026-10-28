import { createContext, useContext, useState, type ReactNode } from "react";

export interface ActiveColorTarget {
  id?: string;
  label?: string;
  value: string;
  onChange: (color: string) => void;
}

interface ColorPickerContextValue {
  activeTarget: ActiveColorTarget | null;
  openPicker: (target: ActiveColorTarget) => void;
  updateValue: (value: string) => void;
  closePicker: () => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | null>(null);

export function ColorPickerProvider({ children }: { children: ReactNode }) {
  const [activeTarget, setActiveTarget] = useState<ActiveColorTarget | null>(null);

  const openPicker = (target: ActiveColorTarget) => {
    setActiveTarget(target);
  };

  const updateValue = (value: string) => {
    setActiveTarget((prev) => (prev ? { ...prev, value } : null));
  };

  const closePicker = () => {
    setActiveTarget(null);
  };

  return (
    <ColorPickerContext.Provider value={{ activeTarget, openPicker, updateValue, closePicker }}>
      {children}
    </ColorPickerContext.Provider>
  );
}

export function useColorPickerContext() {
  return useContext(ColorPickerContext);
}
