"use client";

import { useEffect, useRef } from "react";

export function BrassCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let cursorX = -100, cursorY = -100;
    let ringX = -100, ringY = -100;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      dot.style.left = cursorX + "px";
      dot.style.top = cursorY + "px";
    };

    const animate = () => {
      ringX += (cursorX - ringX) * 0.12;
      ringY += (cursorY - ringY) * 0.12;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      rafId = requestAnimationFrame(animate);
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
    rafId = requestAnimationFrame(animate);
    bindHover();

    const observer = new MutationObserver(bindHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
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
