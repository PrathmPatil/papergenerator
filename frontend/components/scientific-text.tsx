"use client";

import type { CSSProperties } from "react";
import { toScientificHtml } from "@/lib/scientific-text";

export function ScientificText({
  value,
  className,
  style,
}: {
  value: unknown;
  className?: string;
  style?: CSSProperties;
}) {
  const html = toScientificHtml(value);
  if (!html) return null;
  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
