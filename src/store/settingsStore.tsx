import { createContext, useContext, useEffect, useState } from "react";

type SettingsContextType = {
  animationsEnabled: boolean;
  lightMode: boolean;
  setAnimationsEnabled: (v: boolean) => void;
  setLightMode: (v: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  animationsEnabled: true,
  lightMode: false,
  setAnimationsEnabled: () => {},
  setLightMode: () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("spatialTodo_animations") !== "false";
  });
  const [lightMode, setLightModeState] = useState<boolean>(() => {
    return localStorage.getItem("spatialTodo_lightMode") === "true";
  });

  // Apply light class on mount (persisted value)
  useEffect(() => {
    document.documentElement.classList.toggle("light", lightMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <SettingsContext.Provider value={{ animationsEnabled, lightMode, setAnimationsEnabled, setLightMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
