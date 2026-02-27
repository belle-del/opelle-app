"use client";

import { useCallback } from "react";
import { formatPhone, formatPronouns, formatName, formatTags } from "./format-input";

type FormatType = "phone" | "pronouns" | "name" | "tags";

const FORMATTERS: Record<FormatType, (v: string) => string> = {
  phone: formatPhone,
  pronouns: formatPronouns,
  name: formatName,
  tags: formatTags,
};

/**
 * Returns an onBlur handler that auto-formats the input value
 * Usage: <input onBlur={autoFormat("phone")} />
 */
export function useAutoFormat() {
  const autoFormat = useCallback(
    (type: FormatType) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const formatter = FORMATTERS[type];
      if (!formatter) return;
      const formatted = formatter(e.target.value);
      if (formatted !== e.target.value) {
        e.target.value = formatted;
      }
    },
    []
  );

  return autoFormat;
}
