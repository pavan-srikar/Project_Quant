import { SectionTitle, ToggleRow } from "../form-controls";

export function EventsTab({
  activePlugins,
  onTogglePlugin,
}: {
  activePlugins: string[];
  onTogglePlugin?: (id: string) => void;
}) {
  return (
    <div>
      <SectionTitle>Sessions</SectionTitle>
      <ToggleRow
        label="Session breaks"
        hint="Vertical line at each trading-day boundary (intraday only)"
        checked={activePlugins.includes("session-breaks")}
        disabled={!onTogglePlugin}
        onChange={() => onTogglePlugin?.("session-breaks")}
      />
      <ToggleRow
        label="Session highlighting"
        hint="Shade Asia / London / New York forex sessions"
        checked={activePlugins.includes("session")}
        disabled={!onTogglePlugin}
        onChange={() => onTogglePlugin?.("session")}
      />
    </div>
  );
}
