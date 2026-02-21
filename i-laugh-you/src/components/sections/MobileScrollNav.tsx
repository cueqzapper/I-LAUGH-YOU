"use client";

import { useCallback, RefObject } from "react";

interface MobileScrollNavProps {
  isSnapping: RefObject<boolean>;
  osdZoneRef: RefObject<boolean>;
  applyOsdZoneVisibility: (inOsdZone: boolean) => void;
}

export default function MobileScrollNav({
  isSnapping,
  osdZoneRef,
  applyOsdZoneVisibility,
}: MobileScrollNavProps) {
  const scroll = useCallback(
    (direction: -1 | 1) => {
      if (isSnapping.current) return;

      const sections = document.querySelectorAll("#fullpage .section");
      const totalSections = sections.length;
      const sectionHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const cur = Math.round(scrollTop / sectionHeight);
      const next = cur + direction;

      if (next < 0 || next >= totalSections) return;

      const nextInOsdZone = next === 5;
      const zoneWillChange = nextInOsdZone !== osdZoneRef.current;

      isSnapping.current = true;
      const target = next * sectionHeight;
      window.scrollTo({ top: target, behavior: "smooth" });

      if (zoneWillChange) {
        const swapOnArrival = () => {
          if (Math.abs(window.scrollY - target) < 5) {
            applyOsdZoneVisibility(nextInOsdZone);
          } else {
            requestAnimationFrame(swapOnArrival);
          }
        };
        requestAnimationFrame(swapOnArrival);
      }

      setTimeout(() => {
        isSnapping.current = false;
      }, 1000);
    },
    [isSnapping, osdZoneRef, applyOsdZoneVisibility]
  );

  return (
    <div id="mobile-scroll-nav">
      <button
        type="button"
        aria-label="Scroll up"
        onClick={() => scroll(-1)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Scroll down"
        onClick={() => scroll(1)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
