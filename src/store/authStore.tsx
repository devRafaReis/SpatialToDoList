import React, { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/store/authContext";

async function isEmailAllowed(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", email)
    .single();
  return !!data;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState("");
  const popupRef = useRef<Window | null>(null);
  const accessDeniedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAccessDenied = () => {
    if (accessDeniedTimerRef.current) clearTimeout(accessDeniedTimerRef.current);
    setAccessDenied(false);
    setDeniedEmail("");
  };

  // If this window is the OAuth popup callback, close itself once session is ready
  useEffect(() => {
    if (!window.opener) return;
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { clearInterval(interval); window.close(); }
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleSession = async (sessionUser: User | null) => {
    // The popup closes itself via window.close() once the session is ready.
    // Do not call popup.close() here — Google's COOP header makes it throw
    // a console error even inside try/catch.
    popupRef.current = null;

    if (!sessionUser) {
      setUser(null);
      setAccessDenied(false);
      setSigningIn(false);
      setLoading(false);
      return;
    }

    const allowed = await isEmailAllowed(sessionUser.email ?? "");
    if (allowed) {
      setUser(sessionUser);
      setAccessDenied(false);
      setDeniedEmail("");
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setDeniedEmail(sessionUser.email ?? "");
      setAccessDenied(true);
      // Auto-clear after 10s so it doesn't persist on screen
      if (accessDeniedTimerRef.current) clearTimeout(accessDeniedTimerRef.current);
      accessDeniedTimerRef.current = setTimeout(clearAccessDenied, 10_000);
    }
    setSigningIn(false);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = async () => {
    setAccessDenied(false);
    setSigningIn(true);

    const { data } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });

    if (!data?.url) { setSigningIn(false); return; }

    const w = 500, h = 620;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);

    popupRef.current = window.open(
      data.url,
      "google-oauth",
      `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0,scrollbars=1`
    );

    // COOP headers from Google block popup.closed polling, so use the parent
    // window's focus event instead: when the popup closes, focus returns here.
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      // Small delay so onAuthStateChange can fire first if auth succeeded
      setTimeout(() => {
        setSigningIn((current) => {
          // Only clear if auth hasn't already resolved it
          if (current) { popupRef.current = null; return false; }
          return current;
        });
      }, 800);
    };
    window.addEventListener("focus", onFocus);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signingIn, accessDenied, deniedEmail, clearAccessDenied, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
