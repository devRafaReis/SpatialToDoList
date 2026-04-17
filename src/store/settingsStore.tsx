import { createContext, useContext, useEffect, useState } from "react";

export type BoardLayout = "horizontal" | "vertical";

type SettingsContextType = {
  animationsEnabled: boolean;
  lightMode: boolean;
  boardLayout: BoardLayout;
  setAnimationsEnabled: (v: boolean) => void;
  setLightMode: (v: boolean) => void;
  setBoardLayout: (v: BoardLayout) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  animationsEnabled: true,
  lightMode: false,
  boardLayout: "horizontal",
  setAnimationsEnabled: () => {},
  setLightMode: () => {},
  setBoardLayout: () => {},
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

  // Apply light class on mount (persisted value)
  useEffect(() => {
    document.documentElement.classList.toggle("light", lightMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setBoardLayout = (v: BoardLayout) => {
    setBoardLayoutState(v);
    localStorage.setItem("spatialTodo_boardLayout", v);
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
    <SettingsContext.Provider value={{ animationsEnabled, lightMode, boardLayout, setAnimationsEnabled, setLightMode, setBoardLayout }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
