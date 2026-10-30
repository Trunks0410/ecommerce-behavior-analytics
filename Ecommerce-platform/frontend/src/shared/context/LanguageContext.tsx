import React, { createContext, useContext, useState, useEffect } from "react";
import { vi, TranslationKey } from "../locales/vi";
import { en } from "../locales/en";

type Language = "vi" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "vi";
    const saved = window.localStorage.getItem("meemart_language") as Language;
    return saved === "en" || saved === "vi" ? saved : "vi";
  });
  const applyLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("meemart_language", nextLanguage);
      window.dispatchEvent(new CustomEvent("meemart-language-change", { detail: { language: nextLanguage } }));
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLanguage;
      document.documentElement.setAttribute("data-language", nextLanguage);
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.setAttribute("data-language", language);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("meemart_language", language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "meemart_language") {
        const next = event.newValue;
        if (next === "en" || next === "vi") setLanguageState(next);
      }
    };

    const handleLanguageEvent = (event: Event) => {
      const next = (event as CustomEvent<{ language?: Language }>).detail?.language;
      if (next === "en" || next === "vi") setLanguageState(next);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("meemart-language-change", handleLanguageEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("meemart-language-change", handleLanguageEvent);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    applyLanguage(lang);
  };

  const toggleLanguage = () => {
    const nextLanguage: Language = language === "vi" ? "en" : "vi";
    applyLanguage(nextLanguage);
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const dict = language === "en" ? en : vi;
    return (dict as Record<string, string>)[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
