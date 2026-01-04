"use client";

import { useContext } from "react";
import { DataHealthContext } from "@/components/DataHealthProvider";

export const useDataHealth = () => {
  const ctx = useContext(DataHealthContext);
  if (!ctx) {
    throw new Error("useDataHealth must be used within DataHealthProvider");
  }
  return ctx;
};
