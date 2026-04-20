import { createContext, useContext } from "react";
import type { Language } from "@/i18n/translations";

export type BoardLayout = "horizontal" | "vertical";
export type { Language };

export type SettingsContextType = {
  animationsEnabled: boolean;
  lightMode: boolean;
  boardLayout: BoardLayout;
  checklistExpandedByDefault: boolean;
  language: Language;
  setAnimationsEnabled: (v: boolean) => void;
  setLightMode: (v: boolean) => void;
  setBoardLayout: (v: BoardLayout) => void;
  setChecklistExpandedByDefault: (v: boolean) => void;
  setLanguage: (v: Language) => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  animationsEnabled: true,
  lightMode: false,
  boardLayout: "horizontal",
  checklistExpandedByDefault: false,
  language: "en",
  setAnimationsEnabled: () => {},
  setLightMode: () => {},
  setBoardLayout: () => {},
  setChecklistExpandedByDefault: () => {},
  setLanguage: () => {},
});

export const useSettings = () => useContext(SettingsContext);
