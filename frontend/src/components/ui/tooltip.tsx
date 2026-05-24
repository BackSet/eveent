import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  delay?: number;
  className?: string;
  maxWidth?: number;
  minWidth?: number;
}

const VIEWPORT_MARGIN = 8;
const GAP = 6;

const OPPOSITE_SIDE: Record<TooltipSide, TooltipSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function computePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferredSide: TooltipSide
): { top: number; left: number; side: TooltipSide } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const calc = (side: TooltipSide) => {
    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - tooltipRect.height - GAP;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + GAP;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - GAP;
        break;
      case "right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + GAP;
        break;
    }

    return { top, left, side };
  };

  const fits = (pos: { top: number; left: number }) =>
    pos.left >= VIEWPORT_MARGIN &&
    pos.top >= VIEWPORT_MARGIN &&
    pos.left + tooltipRect.width <= vw - VIEWPORT_MARGIN &&
    pos.top + tooltipRect.height <= vh - VIEWPORT_MARGIN;

  const primary = calc(preferredSide);
  if (fits(primary)) return primary;

  const flipped = calc(OPPOSITE_SIDE[preferredSide]);
  if (fits(flipped)) return flipped;

  // Clamp to viewport
  const clamped = { ...primary };
  clamped.left = Math.min(
    Math.max(VIEWPORT_MARGIN, clamped.left),
    vw - tooltipRect.width - VIEWPORT_MARGIN
  );
  clamped.top = Math.min(
    Math.max(VIEWPORT_MARGIN, clamped.top),
    vh - tooltipRect.height - VIEWPORT_MARGIN
  );
  return clamped;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delay = 200,
  className,
  maxWidth = 260,
  minWidth = 200,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const pos = computePosition(triggerRect, tooltipRect, side);
    setCoords({ top: pos.top, left: pos.left });
  }, [side]);

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setCoords(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, updatePosition, content, maxWidth, minWidth]);

  useEffect(() => {
    if (!visible) return;

    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [visible, updatePosition]);

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, hide]);

  const tooltipStyle: CSSProperties = {
    top: coords?.top ?? -9999,
    left: coords?.left ?? -9999,
    minWidth,
    maxWidth: Math.min(maxWidth, window.innerWidth * 0.9),
    visibility: coords ? "visible" : "hidden",
  };

  const tooltipNode =
    visible &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={tooltipStyle}
        className={cn(
          "tooltip-layer fixed z-[110] px-3 py-2 rounded-md",
          "bg-popover text-popover-foreground text-xs font-medium leading-relaxed",
          "shadow-lg border border-border pointer-events-none",
          "animate-fadeIn whitespace-normal",
          className
        )}
      >
        {content}
      </div>,
      document.body
    );

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={visible ? tooltipId : undefined}
      >
        {children}
      </span>
      {tooltipNode}
    </>
  );
}
