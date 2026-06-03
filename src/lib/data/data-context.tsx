"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CreditWallet, Profile, Session } from "@/lib/types";
import { db } from ".";
import type { DataProvider, SignUpInput } from "./provider";

interface DataContextValue {
  /** The active provider — call this for any non-auth data access. */
  db: DataProvider;
  /** Current session (null = signed out). */
  session: Session | null;
  /** True until the initial session check completes. */
  loading: boolean;
  /** Current credit wallet (null when signed out / not yet loaded). */
  wallet: CreditWallet | null;
  signIn: (email: string, password: string) => Promise<Session>;
  signUp: (input: SignUpInput) => Promise<Session>;
  signOut: () => Promise<void>;
  /** Re-read the session/profile (e.g. after updateProfile). */
  refresh: () => Promise<void>;
  /** Re-read the wallet (e.g. after a purchase or a campaign send). */
  refreshWallet: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);

  const loadWallet = useCallback(async (s: Session | null) => {
    setWallet(s ? await db.getWallet() : null);
  }, []);

  useEffect(() => {
    let active = true;
    db.getSession().then(async (s) => {
      if (!active) return;
      setSession(s);
      await loadWallet(s);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadWallet]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await db.signIn(email, password);
      setSession(s);
      await loadWallet(s);
      return s;
    },
    [loadWallet]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const s = await db.signUp(input);
      setSession(s);
      await loadWallet(s);
      return s;
    },
    [loadWallet]
  );

  const signOut = useCallback(async () => {
    await db.signOut();
    setSession(null);
    setWallet(null);
  }, []);

  const refresh = useCallback(async () => {
    setSession(await db.getSession());
  }, []);

  const refreshWallet = useCallback(async () => {
    setWallet(await db.getWallet());
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      db,
      session,
      loading,
      wallet,
      signIn,
      signUp,
      signOut,
      refresh,
      refreshWallet,
    }),
    [
      session,
      loading,
      wallet,
      signIn,
      signUp,
      signOut,
      refresh,
      refreshWallet,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/** Access the data provider + session from any client component. */
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within <DataProviderClient>");
  }
  return ctx;
}

/** Convenience: the current profile, or null. */
export function useProfile(): Profile | null {
  return useData().session?.profile ?? null;
}
