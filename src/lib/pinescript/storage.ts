import type { CustomPineIndicator } from "./types";
import { parsePineScript } from "./parser";

const STORAGE_KEY = "project_quant_custom_pine_scripts";
export const CUSTOM_PINE_UPDATED_EVENT = "custom-pine-indicators-updated";
export const OPEN_PINESCRIPT_EDITOR_EVENT = "open-pinescript-editor";

export function openPineScriptEditor(type?: string | null): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OPEN_PINESCRIPT_EDITOR_EVENT, { detail: { type } }),
    );
  }
}

export function getCustomPineIndicators(): CustomPineIndicator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveCustomPineIndicator(
  code: string,
  nameOverride?: string,
): CustomPineIndicator {
  const parsed = parsePineScript(code);
  const name = nameOverride || parsed.title || "Custom Indicator";
  const overlay = parsed.overlay;
  const linePlot = parsed.plots.find((p) => !p.displayNone && p.title !== "Reference Price");

  const primaryColor = linePlot?.color || (parsed.hasForecastPolyline ? "#ff5d00" : (overlay ? "#f0b90b" : "#ab47bc"));

  const id = `pine_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: CustomPineIndicator = {
    id,
    name,
    code,
    overlay,
    color: primaryColor,
    createdAt: Date.now(),
  };


  const list = getCustomPineIndicators();
  list.unshift(item);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(CUSTOM_PINE_UPDATED_EVENT));
    } catch {}
  }

  return item;
}

export function updateCustomPineIndicator(
  id: string,
  code: string,
  nameOverride?: string,
): CustomPineIndicator | null {
  const list = getCustomPineIndicators();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const parsed = parsePineScript(code);
  const name = nameOverride || parsed.title || list[idx]!.name;
  const overlay = parsed.overlay;
  const linePlot = parsed.plots.find((p) => !p.displayNone && p.title !== "Reference Price");

  const primaryColor = linePlot?.color || (parsed.hasForecastPolyline ? "#ff5d00" : list[idx]!.color);


  const updated: CustomPineIndicator = {
    ...list[idx]!,
    name,
    code,
    overlay,
    color: primaryColor,
  };

  list[idx] = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(CUSTOM_PINE_UPDATED_EVENT));
    } catch {}
  }

  return updated;
}

export function updateCustomPineIndicatorInputs(
  id: string,
  inputs: Record<string, any>,
): CustomPineIndicator | null {
  const list = getCustomPineIndicators();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const updated: CustomPineIndicator = {
    ...list[idx]!,
    inputs: {
      ...(list[idx]!.inputs || {}),
      ...inputs,
    },
  };

  list[idx] = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(CUSTOM_PINE_UPDATED_EVENT));
    } catch {}
  }

  return updated;
}

export function deleteCustomPineIndicator(id: string): void {
  const list = getCustomPineIndicators().filter((item) => item.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(CUSTOM_PINE_UPDATED_EVENT));
    } catch {}
  }
}

