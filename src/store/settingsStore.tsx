import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/authStore";
import { fetchSettings, saveSettingsRemote } from "@/services/supabaseStorage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

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
    return localStorage.getItem(STORAGE_KEYS.ANIMATIONS) !== "false";
  });
  const [lightMode, setLightModeState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.LIGHT_MODE) === "true";
  });
  const [boardLayout, setBoardLayoutState] = useState<BoardLayout>(() => {
    return (localStorage.getItem(STORAGE_KEYS.BOARD_LAYOUT) as BoardLayout) ?? "horizontal";
  });
  const [checklistExpandedByDefault, setChecklistExpandedByDefaultState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CHECKLIST_EXPANDED) === "true";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", lightMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load settings from Supabase on login; reset to localStorage on logout
  useEffect(() => {
    cloudSyncReady.current = false;
    if (!user) {
      setAnimationsEnabledState(localStorage.getItem(STORAGE_KEYS.ANIMATIONS) !== "false");
      setLightModeState(localStorage.getItem(STORAGE_KEYS.LIGHT_MODE) === "true");
      setBoardLayoutState((localStorage.getItem(STORAGE_KEYS.BOARD_LAYOUT) as BoardLayout) ?? "horizontal");
      setChecklistExpandedByDefaultState(localStorage.getItem(STORAGE_KEYS.CHECKLIST_EXPANDED) === "true");
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
      })
      .catch(console.error)
      .finally(() => { cloudSyncReady.current = true; });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncCloud = (settings: { animationsEnabled: boolean; lightMode: boolean; boardLayout: string; checklistExpandedByDefault: boolean }) => {
    if (user && cloudSyncReady.current) {
      saveSettingsRemote(user.id, settings).catch(console.error);
    }
  };

  const setBoardLayout = (v: BoardLayout) => {
    setBoardLayoutState(v);
    localStorage.setItem(STORAGE_KEYS.BOARD_LAYOUT, v);
    syncCloud({ animationsEnabled, lightMode, boardLayout: v, checklistExpandedByDefault });
  };

  const setChecklistExpandedByDefault = (v: boolean) => {
    setChecklistExpandedByDefaultState(v);
    localStorage.setItem(STORAGE_KEYS.CHECKLIST_EXPANDED, String(v));
    syncCloud({ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault: v });
  };

  const setAnimationsEnabled = (v: boolean) => {
    setAnimationsEnabledState(v);
    localStorage.setItem(STORAGE_KEYS.ANIMATIONS, String(v));
    syncCloud({ animationsEnabled: v, lightMode, boardLayout, checklistExpandedByDefault });
  };

  // Also resets animationsEnabled — light mode disables space animations.
  const setLightMode = (v: boolean) => {
    setLightModeState(v);
    localStorage.setItem(STORAGE_KEYS.LIGHT_MODE, String(v));
    document.documentElement.classList.toggle("light", v);
    const newAnimations = !v;
    setAnimationsEnabledState(newAnimations);
    localStorage.setItem(STORAGE_KEYS.ANIMATIONS, String(newAnimations));
    syncCloud({ animationsEnabled: newAnimations, lightMode: v, boardLayout, checklistExpandedByDefault });
  };

  return (
    <SettingsContext.Provider value={{ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault, setAnimationsEnabled, setLightMode, setBoardLayout, setChecklistExpandedByDefault }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
