import { dist, type Pt } from "./geometry";

// Touch input gets fat-finger-friendly hit tolerances and a long-press menu.
export const TOUCH_HIT_SCALE = 2;
export const LONG_PRESS_MS = 500;
export const LONG_PRESS_CANCEL_PX = 10;

/** Minimal cross-input event surface shared by mouse and touch paths. */
export interface TakeoverEvt {
  shiftKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export function evtFromTouch(e: TouchEvent): TakeoverEvt {
  return {
    shiftKey: false,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation(),
  };
}

export function isTextInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

export interface LongPressState {
  timer: number;
  id: string;
  startPos: Pt;
}

export class LongPressTracker {
  private state: LongPressState | null = null;

  start(id: string, pos: Pt, onTrigger: (id: string) => void): void {
    this.clear();
    const timer = window.setTimeout(() => {
      this.state = null;
      onTrigger(id);
    }, LONG_PRESS_MS);
    this.state = { timer, id, startPos: pos };
  }

  cancelIfMoved(pos: Pt | null): void {
    if (!this.state) return;
    if (!pos || dist(pos, this.state.startPos) > LONG_PRESS_CANCEL_PX) {
      this.clear();
    }
  }

  clear(): void {
    if (!this.state) return;
    window.clearTimeout(this.state.timer);
    this.state = null;
  }

  get isActive(): boolean {
    return this.state !== null;
  }
}
