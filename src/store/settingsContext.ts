import { createContext, useContext } from "react";

export type BoardLayout = "horizontal" | "vertical";

export type SettingsContextType = {
  animationsEnabled: boolean;
  lightMode: boolean;
  boardLayout: BoardLayout;
  checklistExpandedByDefault: boolean;
  setAnimationsEnabled: (v: boolean) => void;
  setLightMode: (v: boolean) => void;
  setBoardLayout: (v: BoardLayout) => void;
  setChecklistExpandedByDefault: (v: boolean) => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  animationsEnabled: true,
  lightMode: false,
  boardLayout: "horizontal",
  checklistExpandedByDefault: false,
  setAnimationsEnabled: () => {},
  setLightMode: () => {},
  setBoardLayout: () => {},
  setChecklistExpandedByDefault: () => {},
});

export const useSettings = () => useContext(SettingsContext);
