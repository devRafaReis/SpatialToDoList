import { createContext, useContext, useEffect, useState } from "react";

export type BoardLayout = "horizontal" | "vertical";

type SettingsContextType = {
  animationsEnabled: boolean;
  lightMode: boolean;
  boardLayout: BoardLayout;
  checklistExpandedByDefault: boolean;
  setAnimationsEnabled: (v: boolean) => void;
  setLightMode: (v: boolean) => void;
  setBoardLayout: (v: BoardLayout) => void;
  setChecklistExpandedByDefault: (v: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  animationsEnabled: true,
  lightMode: false,
  boardLayout: "horizontal",
  checklistExpandedByDefault: false,
  setAnimationsEnabled: () => {},
  setLightMode: () => {},
  setBoardLayout: () => {},
  setChecklistExpandedByDefault: () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("spatialTodo_animations") !== "false";
  });
  const [lightMode, setLightModeState] = useState<boolean>(() => {
    return localStorage.getItem("spatialTodo_lightMode") === "true";
  });
  const [boardLayout, setBoardLayoutState] = useState<BoardLayout>(() => {
    return (localStorage.getItem("spatialTodo_boardLayout") as BoardLayout) ?? "horizontal";
  });
  const [checklistExpandedByDefault, setChecklistExpandedByDefaultState] = useState<boolean>(() => {
    return localStorage.getItem("spatialTodo_checklistExpanded") === "true";
  });

  // Apply light class on mount (persisted value)
  useEffect(() => {
    document.documentElement.classList.toggle("light", lightMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setBoardLayout = (v: BoardLayout) => {
    setBoardLayoutState(v);
    localStorage.setItem("spatialTodo_boardLayout", v);
  };

  const setChecklistExpandedByDefault = (v: boolean) => {
    setChecklistExpandedByDefaultState(v);
    localStorage.setItem("spatialTodo_checklistExpanded", String(v));
  };

  const setAnimationsEnabled = (v: boolean) => {
    setAnimationsEnabledState(v);
    localStorage.setItem("spatialTodo_animations", String(v));
  };

  const setLightMode = (v: boolean) => {
    setLightModeState(v);
    localStorage.setItem("spatialTodo_lightMode", String(v));
    document.documentElement.classList.toggle("light", v);
    if (v) {
      setAnimationsEnabledState(false);
      localStorage.setItem("spatialTodo_animations", "false");
    } else {
      setAnimationsEnabledState(true);
      localStorage.setItem("spatialTodo_animations", "true");
    }
  };

  return (
    <SettingsContext.Provider value={{ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault, setAnimationsEnabled, setLightMode, setBoardLayout, setChecklistExpandedByDefault }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
