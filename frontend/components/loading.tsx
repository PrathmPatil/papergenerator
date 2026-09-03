import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

const SPINNER_SIZE: Record<
  SpinnerSize,
  { wrap: string; icon: string; ring: string }
> = {
  sm: {
    wrap: "h-4 w-4",
    icon: "h-3.5 w-3.5",
    ring: "inset-[-4px] border-2",
  },
  md: {
    wrap: "h-8 w-8",
    icon: "h-5 w-5",
    ring: "inset-[-7px] border-[2.5px]",
  },
  lg: {
    wrap: "h-14 w-14",
    icon: "h-8 w-8",
    ring: "inset-[-11px] border-[3px]",
  },
};

type IconSpinnerProps = {
  icon?: LucideIcon;
  size?: SpinnerSize;
  spinning?: boolean;
  className?: string;
  iconClassName?: string;
  ringClassName?: string;
};

/** Icon with an optional spinning ring behind it — use for buttons and inline waits. */
export function IconSpinner({
  icon: Icon = FileText,
  size = "sm",
  spinning = true,
  className,
  iconClassName,
  ringClassName,
}: IconSpinnerProps) {
  const dims = SPINNER_SIZE[size];

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        dims.wrap,
        className
      )}
      aria-hidden={!spinning}
    >
      {spinning ? (
        <span
          className={cn(
            "absolute animate-spin rounded-full border-muted-foreground/25 border-t-foreground",
            dims.ring,
            ringClassName
          )}
        />
      ) : null}
      <Icon className={cn("relative", dims.icon, iconClassName)} />
    </span>
  );
}

type LoadingPanelProps = {
  label?: string;
  icon?: LucideIcon;
  size?: SpinnerSize;
  className?: string;
};

/** Centered loading block for cards, tables, and page panels. */
export function LoadingPanel({
  label = "Loading...",
  icon = FileText,
  size = "lg",
  className,
}: LoadingPanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] w-full flex-col items-center justify-center gap-3 p-8 text-center",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <IconSpinner icon={icon} size={size} />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}

type FullScreenLoadingProps = {
  label?: string;
  icon?: LucideIcon;
};

/** Full-viewport loading overlay. */
export function FullScreenLoading({
  label = "Loading...",
  icon = FileText,
}: FullScreenLoadingProps = {}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-[1px]">
      <LoadingPanel label={label} icon={icon} size="lg" />
    </div>
  );
}

/** Default Next.js route `loading.tsx` export. */
export default function Loading() {
  return <LoadingPanel label="Loading..." />;
}
