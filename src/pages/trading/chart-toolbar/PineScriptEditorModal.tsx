import { useState, useEffect, type ChangeEvent, type DragEvent } from "react";
import { Code2, FileUp, X, AlertCircle, CheckCircle2, Play } from "lucide-react";
import {
  parsePineScript,
  saveCustomPineIndicator,
  updateCustomPineIndicator,
  getCustomPineIndicators,
  getIndicatorPineScript,
} from "../../../lib/pinescript";
import type { IndicatorType } from "../../../lib/indicators/types";
import { useIndicatorSettings } from "../../../hooks/useIndicatorSettings";

export interface PineScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorType?: IndicatorType | null;
  onIndicatorSaved?: (type: IndicatorType, isOverlay: boolean) => void;
}

export function PineScriptEditorModal({
  isOpen,
  onClose,
  indicatorType,
  onIndicatorSaved,
}: PineScriptEditorModalProps) {
  const { settings } = useIndicatorSettings();
  const [code, setCode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize script code and name when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (indicatorType) {
      if (indicatorType.startsWith("pine_")) {
        const custom = getCustomPineIndicators().find((c) => c.id === indicatorType);
        if (custom) {
          setCode(custom.code);
          setName(custom.name);
          setError(null);
          return;
        }
      }
      const stg = settings[indicatorType];
      const template = getIndicatorPineScript(indicatorType, stg);
      setCode(template);
      setName(indicatorType);
      setError(null);
    } else {
      setCode("");
      setName("");
      setError(null);
    }
  }, [isOpen, indicatorType, settings]);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCode(content);
        const parsed = parsePineScript(content);
        if (parsed.title) setName(parsed.title);
        setError(parsed.errors.length > 0 ? (parsed.errors[0] ?? null) : null);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const parsedPreview = parsePineScript(code);

  const handleSave = () => {
    if (
      parsedPreview.errors.length > 0 &&
      parsedPreview.plots.length === 0 &&
      parsedPreview.hlines.length === 0 &&
      !parsedPreview.hasBoxesOrLines &&
      !parsedPreview.hasForecastPolyline
    ) {
      setError(parsedPreview.errors[0] ?? "Script contains errors");
      return;
    }

    const indicatorName = name.trim() || parsedPreview.title || "Custom Indicator";

    if (indicatorType && indicatorType.startsWith("pine_")) {
      const updated = updateCustomPineIndicator(indicatorType, code, indicatorName);
      if (updated) {
        onIndicatorSaved?.(updated.id as IndicatorType, updated.overlay);
      }
    } else {
      const item = saveCustomPineIndicator(code, indicatorName);
      onIndicatorSaved?.(item.id as IndicatorType, item.overlay);
    }

    onClose();
  };

  const isEditing = Boolean(indicatorType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl bg-[#1e222d] border border-[#2a2e39] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onDragEnter={handleDrag}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2e39] bg-[#171b26]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#2962ff]/20 text-[#2962ff]">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isEditing ? `Edit Pine Script: ${name || indicatorType}` : "Import / Create Pine Script"}
              </h2>
              <p className="text-[11px] text-neutral-400">
                TradingView Pine Script v4/v5 code • Modify calculations, inputs, and plots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#2a2e39] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* File Upload Dropzone (for quick import) */}
          {!isEditing && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-[#2962ff] bg-[#2962ff]/10"
                  : "border-[#2a2e39] hover:border-[#363a45] bg-[#131722]/50"
              }`}
              onClick={() => document.getElementById("pine-file-input")?.click()}
            >
              <input
                id="pine-file-input"
                type="file"
                accept=".pine,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center justify-center gap-2 text-neutral-300">
                <FileUp className="h-4 w-4 text-[#2962ff]" />
                <span className="font-medium">Upload .pine or .txt script file</span>
                <span className="text-neutral-500">or drag and drop here</span>
              </div>
            </div>
          )}

          {/* Indicator Name Input */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
              Indicator Name
            </label>
            <input
              type="text"
              placeholder={parsedPreview.title || "Custom Indicator Name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white focus:outline-none focus:border-[#2962ff] text-xs font-medium"
            />
          </div>

          {/* Code Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-neutral-300">
                Pine Script Source Code
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-neutral-400">Target Pane:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    parsedPreview.overlay
                      ? "bg-[#2962ff]/20 text-[#2962ff]"
                      : "bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {parsedPreview.overlay ? "Main Chart (Overlay)" : "Sub-Chart (Oscillator)"}
                </span>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              rows={13}
              spellCheck={false}
              className="w-full font-mono text-[11px] px-3.5 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] text-neutral-100 focus:outline-none focus:border-[#2962ff] resize-none leading-relaxed shadow-inner"
              placeholder="//@version=5&#10;indicator('My Indicator', overlay=true)&#10;plot(close, 'Price')"
            />
          </div>

          {/* Validation Status */}
          {error ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            (parsedPreview.plots.length > 0 ||
              parsedPreview.hlines.length > 0 ||
              parsedPreview.hasBoxesOrLines ||
              parsedPreview.hasForecastPolyline) && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  {parsedPreview.plots.length > 0
                    ? `Valid script: ${parsedPreview.plots.length} plot(s) detected (${parsedPreview.plots.map((p) => p.title).join(", ")})`
                    : `Valid script: Drawing indicator detected (${parsedPreview.inputs.length} input(s))`}
                </span>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2e39] bg-[#171b26]">
          <span className="text-[11px] text-neutral-400">
            {parsedPreview.inputs.length} user input(s) configured
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-[#2a2e39] font-medium transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                parsedPreview.plots.length === 0 &&
                parsedPreview.hlines.length === 0 &&
                !parsedPreview.hasBoxesOrLines &&
                !parsedPreview.hasForecastPolyline
              }
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors text-xs shadow-lg shadow-[#2962ff]/20"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isEditing ? "Save & Apply Changes" : "Save & Add Indicator"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
