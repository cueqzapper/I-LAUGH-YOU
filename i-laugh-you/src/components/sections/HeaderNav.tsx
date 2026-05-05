"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

const NAV_ICON_KEYS = [
  { icon: "icon-smile", labelKey: "nav.pickAPiece" },
  { icon: "icon-heart-broken", labelKey: "nav.lovelySmile" },
  { icon: "icon-money", labelKey: "nav.whatDoesItCost" },
  { icon: "icon-sofa", labelKey: "nav.castingCouch" },
];

const LANGUAGES = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
] as const;

const NavButtonSvg = () => (
  <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle className="button0" cx="40" cy="40" r="38" />
  </svg>
);

interface HeaderNavProps {
  lang: string;
  onLangChange: (lang: string) => void;
  basketCount?: number;
}

function sectionToNavIndex(section: number): number {
  if (section >= 2 && section <= 4) return 1;  // USPs → lovely smile
  if (section === 5 || section === 6) return 0; // zoom/picker → pick a piece
  if (section === 7) return 2;                   // price → money
  if (section >= 8) return 3;                    // sofa → sofa
  return -1;                                     // intro/title → none
}

function navIndexToSection(index: number): number {
  switch (index) {
    case 0: return 5; // pick a piece -> zoom (section 5)
    case 1: return 2; // lovely smile -> USPs (section 2)
    case 2: return 7; // money -> price (section 7)
    case 3: return 8; // sofa -> sofa (section 8)
    default: return 0;
  }
}

export default function HeaderNav({ lang, onLangChange, basketCount = 0 }: HeaderNavProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const [headerVisible, setHeaderVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(-1);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      // Already on home — just scroll to the top slide
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Navigate home via SPA, then make sure we land at the top
      e.preventDefault();
      router.push("/");
      window.scrollTo({ top: 0 });
    }
  };

  useEffect(() => {
    if (pathname !== "/") {
      setHeaderVisible(true);
      setNavVisible(false);
      return;
    }

    const FADE_IN_OFFSET = 3300;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const opacity = (scrollTop - FADE_IN_OFFSET) / 500;
      setHeaderVisible(opacity > 0);
      setNavVisible(opacity > 0);

      const sections = document.querySelectorAll<HTMLElement>("#fullpage .section");
      let currentSection = 0;
      for (let i = sections.length - 1; i >= 0; i--) {
        if (scrollTop >= sections[i].offsetTop - 5) {
          currentSection = i;
          break;
        }
      }
      setActiveNavIndex(sectionToNavIndex(currentSection));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const handleMobileNavOpen = () => {
    setMobileNavOpen(true);
    document.body.style.overflow = "hidden";
  };

  const handleMobileNavClose = () => {
    setMobileNavOpen(false);
    document.body.style.overflow = "auto";
  };

  const scrollToNavIndex = (index: number) => {
    const targetSection = navIndexToSection(index);
    const sections = document.querySelectorAll<HTMLElement>("#fullpage .section");
    const targetY = sections[targetSection]?.offsetTop ?? 0;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <>
      {/* Top Header Bar */}
      <div id="header-nav" className={headerVisible ? "visible" : ""}>
        <Link href="/" id="header-logo-link" onClick={handleLogoClick}>
          <Image
            src="/img/logo-white.png"
            id="logo"
            alt="I LAUGH YOU Logo"
            width={400}
            height={150}
            priority
          />
        </Link>

        <div id="header-favorites">
          <a
            href="/cart"
            className={`header-cart-chip${basketCount > 0 ? " has-items" : ""}`}
            aria-label={t("nav.cart", { defaultValue: "Cart" })}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {basketCount > 0 && <span className="header-cart-count">{basketCount}</span>}
          </a>
        </div>

        <div id="desktop-language-wrapper">
          <ul className="language-list">
            {LANGUAGES.map((language) => (
              <li className="language-item" key={language.code}>
                <button
                  type="button"
                  className={`language-link ${lang === language.code ? "active" : ""}`}
                  onClick={() => onLangChange(language.code)}
                >
                  {language.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="icon icon-menu-open"
          id="mobile-open-nav"
          onClick={handleMobileNavOpen}
        />
        <div
          className="icon icon-menu-collapse"
          id="mobile-collapse-nav"
          onClick={handleMobileNavClose}
          style={{ display: mobileNavOpen ? "block" : "none" }}
        />
      </div>

      {/* Desktop Side Nav */}
      <div id="desktop-nav" className={navVisible ? "visible" : ""}>
        {NAV_ICON_KEYS.map((item, i) => (
          <div
            className={`nav-entry${i === activeNavIndex ? " activeNavEntry" : ""}`}
            key={i}
            onClick={() => scrollToNavIndex(i)}
            style={{ cursor: "pointer" }}
            title={t(item.labelKey)}
          >
            <NavButtonSvg />
            <div className={`icon ${item.icon}`} />
          </div>
        ))}
      </div>

      {/* Mobile Nav Overlay */}
      <div id="mobile-nav" className={mobileNavOpen ? "open" : ""}>
        <div id="mobile-nav-close" onClick={handleMobileNavClose}>
          ×
        </div>

        <div id="mobile-language-wrapper">
          <ul className="language-list">
            {LANGUAGES.map((language) => (
              <li className="language-item" key={`mobile-${language.code}`}>
                <button
                  type="button"
                  className={`language-link ${lang === language.code ? "active" : ""}`}
                  onClick={() => {
                    onLangChange(language.code);
                    handleMobileNavClose();
                  }}
                >
                  {language.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div id="mobile-nav-entries-wrapper">
          {NAV_ICON_KEYS.map((item, i) => (
            <div 
              className="nav-entry" 
              key={i} 
              onClick={() => {
                scrollToNavIndex(i);
                handleMobileNavClose();
              }}
              style={{ cursor: "pointer" }}
            >
              <NavButtonSvg />
              <div className={`icon ${item.icon}`} />
              <span>{t(item.labelKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
