import type { IndicatorType } from "../../../lib/indicators/types";
import {
  PineScriptEditorModal,
  type PineScriptEditorModalProps,
} from "./PineScriptEditorModal";

export interface PineScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIndicatorImported: (type: IndicatorType) => void;
  indicatorType?: IndicatorType | null;
}

export function PineScriptImportModal({
  isOpen,
  onClose,
  onIndicatorImported,
  indicatorType,
}: PineScriptImportModalProps) {
  return (
    <PineScriptEditorModal
      isOpen={isOpen}
      onClose={onClose}
      indicatorType={indicatorType}
      onIndicatorSaved={(type) => onIndicatorImported(type)}
    />
  );
}

export { PineScriptEditorModal };
export type { PineScriptEditorModalProps };
