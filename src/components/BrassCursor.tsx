"use client";

import { useEffect, useRef } from "react";

export function BrassCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      ring.style.left = e.clientX + "px";
      ring.style.top = e.clientY + "px";
    };

    const bindHover = () => {
      document
        .querySelectorAll("a,button,input,select,textarea,[role='button']")
        .forEach((el) => {
          el.addEventListener("mouseenter", () => {
            dot?.classList.add("hovering");
            ring?.classList.add("hovering");
          });
          el.addEventListener("mouseleave", () => {
            dot?.classList.remove("hovering");
            ring?.classList.remove("hovering");
          });
        });
    };

    document.addEventListener("mousemove", onMove);
    bindHover();

    const observer = new MutationObserver(bindHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
