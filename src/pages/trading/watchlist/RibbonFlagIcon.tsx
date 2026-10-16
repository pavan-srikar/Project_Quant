import { cn } from "@/lib/utils";

export function RibbonFlagIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return (
      <svg
        viewBox="0 0 16 19"
        fill="currentColor"
        className={cn("shrink-0", className)}
        aria-hidden="true"
      >
        <path d="M0.5 1.2C0.5 0.8 0.8 0.5 1.2 0.5H14.8C15.2 0.5 15.5 0.8 15.5 1.2V18.5L8 14.1L0.5 18.5V1.2Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M1.5 1.5H14.5V17.2L8 13.5L1.5 17.2V1.5Z" />
    </svg>
  );
}
