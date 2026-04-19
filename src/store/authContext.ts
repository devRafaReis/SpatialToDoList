import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  accessDenied: boolean;
  deniedEmail: string;
  clearAccessDenied: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signingIn: false,
  accessDenied: false,
  deniedEmail: "",
  clearAccessDenied: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);
