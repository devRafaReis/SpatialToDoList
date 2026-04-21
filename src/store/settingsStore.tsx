import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/authContext";
import { fetchSettings, saveSettingsRemote } from "@/services/supabaseStorage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { SettingsContext, BoardLayout, Language } from "@/store/settingsContext";

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
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return (stored === "pt-BR" ? "pt-BR" : "en") as Language;
  });
  const [privacyMode, setPrivacyMode] = useState(false);
  const [completedBoardId, setCompletedBoardIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.DONE_BOARD_ID) ?? null;
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
          setLanguageState(cloud.language as Language);
          localStorage.setItem(STORAGE_KEYS.LANGUAGE, cloud.language);
          setCompletedBoardIdState(cloud.completedBoardId);
          if (cloud.completedBoardId) localStorage.setItem(STORAGE_KEYS.DONE_BOARD_ID, cloud.completedBoardId);
          else localStorage.removeItem(STORAGE_KEYS.DONE_BOARD_ID);
          document.documentElement.classList.toggle("light", cloud.lightMode);
        } else {
          // First login — push local settings to Supabase
          saveSettingsRemote(user.id, {
            animationsEnabled,
            lightMode,
            boardLayout,
            checklistExpandedByDefault,
            language,
            completedBoardId,
          }).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => { cloudSyncReady.current = true; });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncCloud = (settings: { animationsEnabled: boolean; lightMode: boolean; boardLayout: string; checklistExpandedByDefault: boolean; language: string; completedBoardId: string | null }) => {
    if (user && cloudSyncReady.current) {
      saveSettingsRemote(user.id, settings).catch(console.error);
    }
  };

  const allSettings = () => ({ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault, language, completedBoardId });

  const setBoardLayout = (v: BoardLayout) => {
    setBoardLayoutState(v);
    localStorage.setItem(STORAGE_KEYS.BOARD_LAYOUT, v);
    syncCloud({ ...allSettings(), boardLayout: v });
  };

  const setChecklistExpandedByDefault = (v: boolean) => {
    setChecklistExpandedByDefaultState(v);
    localStorage.setItem(STORAGE_KEYS.CHECKLIST_EXPANDED, String(v));
    syncCloud({ ...allSettings(), checklistExpandedByDefault: v });
  };

  const setAnimationsEnabled = (v: boolean) => {
    setAnimationsEnabledState(v);
    localStorage.setItem(STORAGE_KEYS.ANIMATIONS, String(v));
    syncCloud({ ...allSettings(), animationsEnabled: v });
  };

  const setLanguage = (v: Language) => {
    setLanguageState(v);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, v);
    syncCloud({ ...allSettings(), language: v });
  };

  const setCompletedBoardId = (v: string | null) => {
    setCompletedBoardIdState(v);
    if (v === null) localStorage.removeItem(STORAGE_KEYS.DONE_BOARD_ID);
    else localStorage.setItem(STORAGE_KEYS.DONE_BOARD_ID, v);
    syncCloud({ ...allSettings(), completedBoardId: v });
  };

  // Also resets animationsEnabled — light mode disables space animations.
  const setLightMode = (v: boolean) => {
    setLightModeState(v);
    localStorage.setItem(STORAGE_KEYS.LIGHT_MODE, String(v));
    document.documentElement.classList.toggle("light", v);
    const newAnimations = !v;
    setAnimationsEnabledState(newAnimations);
    localStorage.setItem(STORAGE_KEYS.ANIMATIONS, String(newAnimations));
    syncCloud({ ...allSettings(), animationsEnabled: newAnimations, lightMode: v });
  };

  return (
    <SettingsContext.Provider value={{ animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault, language, privacyMode, completedBoardId, setAnimationsEnabled, setLightMode, setBoardLayout, setChecklistExpandedByDefault, setLanguage, setPrivacyMode, setCompletedBoardId }}>
      {children}
    </SettingsContext.Provider>
  );
};
