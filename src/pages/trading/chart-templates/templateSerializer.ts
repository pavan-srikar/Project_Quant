import {
  type ChartPreferences,
  TEMPLATE_PREF_KEYS,
} from "../../../hooks/useChartPreferences.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type { ChartTemplateContent } from "../../../services/api/chart-templates.ts";

export function snapshotContent(
  prefs: ChartPreferences,
  indicators: IndicatorType[],
  plugins: string[],
): ChartTemplateContent {
  const snapshot: Record<string, string | boolean> = {};
  for (const key of TEMPLATE_PREF_KEYS) {
    snapshot[key] = prefs[key];
  }
  return { version: 1, prefs: snapshot, indicators, plugins };
}

export function contentToPrefsPatch(content: ChartTemplateContent): Partial<ChartPreferences> {
  const patch: Record<string, string | boolean> = {};
  for (const key of TEMPLATE_PREF_KEYS) {
    const value = content.prefs[key];
    if (value !== undefined) patch[key] = value;
  }
  return patch as Partial<ChartPreferences>;
}
