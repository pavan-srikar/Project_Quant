import { useState, type ChangeEvent, type DragEvent } from "react";
import { Code2, FileUp, Sparkles, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { parsePineScript } from "../../../lib/pinescript/parser";
import { saveCustomPineIndicator } from "../../../lib/pinescript/storage";
import { PINE_SAMPLES } from "../../../lib/pinescript/samples";
import type { IndicatorType } from "../../../lib/indicators/types";

export interface PineScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIndicatorImported: (type: IndicatorType) => void;
}

export function PineScriptImportModal({
  isOpen,
  onClose,
  onIndicatorImported,
}: PineScriptImportModalProps) {
  const [code, setCode] = useState<string>(PINE_SAMPLES[0]?.code ?? "");
  const [name, setName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = () => {
    const parsed = parsePineScript(code);
    if (parsed.errors.length > 0) {
      setError(parsed.errors[0] ?? "Script contains errors");
      return;
    }
    const indicatorName = name.trim() || parsed.title || "Custom Indicator";
    const item = saveCustomPineIndicator(code, indicatorName);
    onIndicatorImported(item.id as IndicatorType);
    onClose();
  };

  const parsedPreview = parsePineScript(code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-[#1e222d] border border-[#2a2e39] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onDragEnter={handleDrag}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2e39] bg-[#171b26]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#2962ff]/20 text-[#2962ff]">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Import Custom Pine Script</h2>
              <p className="text-[11px] text-neutral-400">
                Paste TradingView Pine Script v4/v5 code or drop a .pine / .txt file
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
          {/* File Upload Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-colors cursor-pointer ${
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

          {/* Quick Example Templates */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 shrink-0 flex items-center gap-1 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Templates:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {PINE_SAMPLES.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => {
                    setCode(sample.code);
                    setName(sample.name);
                    setError(null);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#2a2e39] hover:bg-[#363a45] text-neutral-300 hover:text-white font-medium whitespace-nowrap transition-colors text-[11px]"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

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
              className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white focus:outline-none focus:border-[#2962ff] text-xs"
            />
          </div>

          {/* Code Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-300">
                Pine Script Source Code
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-neutral-400">Target Pane:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
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
              rows={9}
              className="w-full font-mono text-[11px] px-3 py-2 rounded-xl bg-[#131722] border border-[#2a2e39] text-neutral-200 focus:outline-none focus:border-[#2962ff] resize-none leading-relaxed"
              placeholder="//@version=5&#10;indicator('My Indicator', overlay=true)&#10;plot(close, 'Price')"
            />
          </div>

          {/* Validation Status / Error Feedback */}
          {error ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            parsedPreview.plots.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Valid script: {parsedPreview.plots.length} plot(s) detected (
                  {parsedPreview.plots.map((p) => p.title).join(", ")})
                </span>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[#2a2e39] bg-[#171b26]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-[#2a2e39] font-medium transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={parsedPreview.plots.length === 0 && parsedPreview.hlines.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors text-xs shadow-lg shadow-[#2962ff]/20"
          >
            Save & Add Indicator
          </button>
        </div>
      </div>
    </div>
  );
}
