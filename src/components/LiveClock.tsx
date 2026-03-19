"use client";
import { useState, useEffect } from "react";

export function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }) + " \u00b7 " + now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <p style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px",
      color: "rgba(255,255,255,0.75)",
      letterSpacing: "0.02em",
    }}>
      {formatted}
    </p>
  );
}
