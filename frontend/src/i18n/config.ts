import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import english from "./english.json";
import vietnamese from "./vietnamese.json";
import japanese from "./japanese.json";
import hindi from "./hindi.json";
import chinese from "./chinese.json";
import korean from "./korean.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: english },
      vi: { translation: vietnamese },
      ja: { translation: japanese },
      hi: { translation: hindi },
      ch: { translation: chinese },
      ko: { translation: korean },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
