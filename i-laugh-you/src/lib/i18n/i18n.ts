import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";
import deShop from "./locales/de/shop.json";
import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enShop from "./locales/en/shop.json";
import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esShop from "./locales/es/shop.json";
import frCommon from "./locales/fr/common.json";
import frHome from "./locales/fr/home.json";
import frShop from "./locales/fr/shop.json";

i18n.use(initReactI18next).init({
  resources: {
    de: { common: deCommon, home: deHome, shop: deShop },
    en: { common: enCommon, home: enHome, shop: enShop },
    es: { common: esCommon, home: esHome, shop: esShop },
    fr: { common: frCommon, home: frHome, shop: frShop },
  },
  lng: "de",
  fallbackLng: "de",
  ns: ["common", "home", "shop"],
  defaultNS: "home",
  interpolation: { escapeValue: false },
});

export default i18n;
