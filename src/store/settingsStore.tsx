import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/authStore";
import { fetchSettings, saveSettingsRemote } from "@/services/supabaseStorage";

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
  const { user } = useAuth();
  const cloudSyncReady = useRef(false);

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

  useEffect(() => {
    document.documentElement.classList.toggle("light", lightMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load settings from Supabase on login; reset to localStorage on logout
  useEffect(() => {
    cloudSyncReady.current = false;
    if (!user) {
      setAnimationsEnabledState(localStorage.getItem("spatialTodo_animations") !== "false");
      setLightModeState(localStorage.getItem("spatialTodo_lightMode") === "true");
      setBoardLayoutState((localStorage.getItem("spatialTodo_boardLayout") as BoardLayout) ?? "horizontal");
      setChecklistExpandedByDefaultState(localStorage.getItem("spatialTodo_checklistExpanded") === "true");
      cloudSyncReady.current = false;
      return;
    }
    fetchSettings(user.id)
      .then((cloud) => {
        if (cloud) {
          setAnimationsEnabledState(cloud.animationsEnabled);
          setLightModeState(cloud.lightMode);
          setBoardLayoutState(cloud.boardLayout as BoardLayout);
          setChecklistExpandedByDefaultState(cloud.checklistExpandedByDefault);
          document.documentElement.classList.toggle("light", cloud.lightMode);
        } else {
          // First login — push local settings to Supabase
          saveSettingsRemote(user.id, {
            animationsEnabled,
            lightMode,
            boardLayout,
            checklistExpandedByDefault,
          }).catch(console.error);
        }
        cloudSyncReady.current = true;
      })
      .catch(console.error);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncCloud = (settings: { animationsEnabled: boolean; lightMode: boolean; boardLayout: string; checklistExpandedByDefault: boolean }) => {
    if (user && cloudSyncReady.current) {
      saveSettingsRemote(user.id, settings).catch(console.error);
    }
  };

  const setBoardLayout = (v: BoardLayout) => {
    setBoardLayoutState(v);
    localStorage.setItem("spatialTodo_boardLayout", v);
    syncCloud({ animationsEnabled, lightMode, boardLayout: v, checklistExpandedByDefault });
  };

  const setChecklistExpandedByDefault = (v: boolean) => {
    setChecklistExpandedByDefaultState(v);
    localStorage.setItem("spatialTodo_checklistExpanded", String(v));
    syncCloud({ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault: v });
  };

  const setAnimationsEnabled = (v: boolean) => {
    setAnimationsEnabledState(v);
    localStorage.setItem("spatialTodo_animations", String(v));
    syncCloud({ animationsEnabled: v, lightMode, boardLayout, checklistExpandedByDefault });
  };

  const setLightMode = (v: boolean) => {
    setLightModeState(v);
    localStorage.setItem("spatialTodo_lightMode", String(v));
    document.documentElement.classList.toggle("light", v);
    const newAnimations = !v;
    setAnimationsEnabledState(newAnimations);
    localStorage.setItem("spatialTodo_animations", String(newAnimations));
    syncCloud({ animationsEnabled: newAnimations, lightMode: v, boardLayout, checklistExpandedByDefault });
  };

  return (
    <SettingsContext.Provider value={{ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault, setAnimationsEnabled, setLightMode, setBoardLayout, setChecklistExpandedByDefault }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
