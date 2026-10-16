import { REPLAY_ENABLED } from "../constants.ts";
import { ChartTemplatesMenu } from "../ChartTemplatesMenu.tsx";
import { ReplayHUD } from "../ReplayHUD.tsx";
import { DrawingToolsDropdown } from "./DrawingToolsDropdown.tsx";
import { IndicatorMenu } from "./IndicatorMenu.tsx";
import { LivePriceBadge } from "./LivePriceBadge.tsx";
import { PluginsDropdown } from "./PluginsDropdown.tsx";
import { RightPanelSelector } from "./RightPanelSelector.tsx";
import { SymbolPicker } from "./SymbolPicker.tsx";
import { TimeframeSelector } from "./TimeframeSelector.tsx";
import type { ChartToolbarProps } from "./types.ts";

export function ChartToolbar({
  selectedSymbol,
  symbols,
  onSymbolChange,
  onOpenSymbolSearch,
  timeframe,
  onTimeframeChange,
  activeIndicators,
  onToggleIndicator,
  showIndicatorMenu,
  onToggleIndicatorMenu,
  drawingTool,
  onDrawingTool,
  drawings,
  onClearDrawings,
  rightPanel,
  onRightPanel,
  showRightPanel,
  onToggleRightPanel,
  tick,
  symbolInfo,
  aiTraderEnabled,
  isReplaying = false,
  replayAccountId,
  activePlugins = [],
  onTogglePlugin,
  onSetIndicators,
  onSetPlugins,
  magnetMode = "none",
  onCycleMagnet,
  stayInDrawingMode = false,
  onToggleStayInDrawingMode,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#2a2e39] bg-[#131722] text-xs shrink-0 overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap no-scrollbar">
      {/* Symbol Selector — TradingView style */}
      <SymbolPicker
        selectedSymbol={selectedSymbol}
        symbols={symbols}
        onSymbolChange={onSymbolChange}
        onOpenSymbolSearch={onOpenSymbolSearch}
      />

      {/* Live Price — bid / ask badges like TradingView */}
      <LivePriceBadge
        tick={tick}
        symbolInfo={symbolInfo}
        selectedSymbol={selectedSymbol}
      />

      {/* Timeframe Selector — locked to 1m while a replay session is active */}
      <TimeframeSelector
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        isReplaying={isReplaying}
      />

      {/* Session replay controls — disabled until the feature is QA'd */}
      {REPLAY_ENABLED && replayAccountId != null && <ReplayHUD accountId={replayAccountId} />}

      {/* Chart layout templates (save/load/autosave) */}
      {onSetIndicators && onSetPlugins && (
        <ChartTemplatesMenu
          activeIndicators={activeIndicators}
          onSetIndicators={onSetIndicators}
          activePlugins={activePlugins}
          onSetPlugins={onSetPlugins}
        />
      )}

      <div className="h-4 border-l border-[#2a2e39] mx-1 hidden md:block" />

      {/* Indicators */}
      <IndicatorMenu
        activeIndicators={activeIndicators}
        onToggleIndicator={onToggleIndicator}
        showIndicatorMenu={showIndicatorMenu}
        onToggleIndicatorMenu={onToggleIndicatorMenu}
      />

      <div className="h-4 border-l border-[#2a2e39] mx-1 hidden md:block" />

      {/* Drawing Tools */}
      <div className="hidden md:flex items-center gap-0.5">
        <DrawingToolsDropdown
          drawingTool={drawingTool}
          onDrawingTool={onDrawingTool}
          drawings={drawings}
          onClearDrawings={onClearDrawings}
          magnetMode={magnetMode}
          onCycleMagnet={onCycleMagnet}
          stayInDrawingMode={stayInDrawingMode}
          onToggleStayInDrawingMode={onToggleStayInDrawingMode}
        />
        {onTogglePlugin && (
          <PluginsDropdown activePlugins={activePlugins} onTogglePlugin={onTogglePlugin} />
        )}
      </div>

      <div className="flex-1 hidden md:block" />

      {/* Right Panel Toggles */}
      <RightPanelSelector
        rightPanel={rightPanel}
        onRightPanel={onRightPanel}
        showRightPanel={showRightPanel}
        onToggleRightPanel={onToggleRightPanel}
        aiTraderEnabled={aiTraderEnabled}
      />
    </div>
  );
}
