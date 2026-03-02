"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const NAV_ICON_KEYS = [
  { icon: "icon-smile", labelKey: "nav.pickAPiece" },
  { icon: "icon-heart-broken", labelKey: "nav.lovelySmile" },
  { icon: "icon-money", labelKey: "nav.whatDoesItCost" },
  { icon: "icon-sofa", labelKey: "nav.castingCouch" },
  { icon: "icon-info", labelKey: "nav.whoIsTheGuy" },
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
  likedCount?: number;
  basketCount?: number;
}

function sectionToNavIndex(section: number): number {
  if (section >= 2 && section <= 4) return 1;  // USPs → lovely smile
  if (section === 5 || section === 6) return 0; // zoom/picker → pick a piece
  if (section === 7) return 2;                   // price → money
  if (section === 8) return 3;                   // sofa → sofa
  if (section >= 9) return 4;                    // bid/concept → info
  return -1;                                     // intro/title → none
}

function navIndexToSection(index: number): number {
  switch (index) {
    case 0: return 5; // pick a piece -> zoom (section 5)
    case 1: return 2; // lovely smile -> USPs (section 2)
    case 2: return 7; // money -> price (section 7)
    case 3: return 8; // sofa -> sofa (section 8)
    case 4: return 9; // info -> bid (section 9)
    default: return 0;
  }
}

export default function HeaderNav({ lang, onLangChange, likedCount = 0, basketCount = 0 }: HeaderNavProps) {
  const { t } = useTranslation("common");
  const [headerVisible, setHeaderVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(-1);

  useEffect(() => {
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
  }, []);

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
        <a href="/" id="header-logo-link">
          <Image
            src="/img/logo-white.png"
            id="logo"
            alt="I LAUGH YOU Logo"
            width={400}
            height={150}
            priority
          />
        </a>

        <div id="header-favorites">
          <div className="header-fav-item">
            <img src="/img/heart-on.png" alt="" />
            <span className="fav-count">{likedCount}</span>
          </div>
          <a href="/cart" className="header-fav-item" style={{ textDecoration: "none", color: "inherit" }}>
            <img src="/img/basket-on.png" alt="" />
            <span className="fav-count">{basketCount}</span>
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
