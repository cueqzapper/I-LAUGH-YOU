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

      const sections = document.querySelectorAll<HTMLElement>("#fullpage .section");
      const totalSections = sections.length;
      const scrollTop = window.scrollY;

      // Find current section by actual DOM offset (robust on mobile)
      let cur = 0;
      for (let i = totalSections - 1; i >= 0; i--) {
        if (scrollTop >= sections[i].offsetTop - 5) {
          cur = i;
          break;
        }
      }
      const next = cur + direction;

      if (next < 0) return;

      if (next >= totalSections) {
        const fullpage = document.getElementById("fullpage");
        if (!fullpage) return;
        isSnapping.current = true;
        window.scrollTo({
          top: fullpage.offsetTop + fullpage.offsetHeight,
          behavior: "smooth",
        });
        setTimeout(() => {
          isSnapping.current = false;
        }, 1000);
        return;
      }

      const nextInOsdZone = next === 5;
      const zoneWillChange = nextInOsdZone !== osdZoneRef.current;

      isSnapping.current = true;
      const target = sections[next].offsetTop;
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
