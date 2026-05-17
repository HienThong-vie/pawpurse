import {
  type ReactNode,
  createContext,
  useState,
  useEffect,
  useContext,
} from "react";
import supabase from "../lib/supabaseClient";

type AuthContextValue = {
  user: any;
  session: any;
  loading: boolean;
  isRecovering: boolean;
  setIsRecovering: (v: boolean) => void;
  username: string;
  updateUsername: (newName: string) => Promise<void>;
};

//container holds the shape of data that will be shared globally
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  isRecovering: false,
  setIsRecovering: () => {},
  username: "User",
  updateUsername: async () => {},
});

//let component access auth data
export function useAuth() {
  return useContext(AuthContext);
}

const RECOVERY_KEY = "smartfinance.isRecovering";

// Detect recovery synchronously at mount, before supabase-js's async URL
// parser fires PASSWORD_RECOVERY. Two signals:
//   1. URL contains "type=recovery" — covers the initial email-link landing
//      (Supabase puts it in the hash for implicit flow, query for PKCE; the
//      substring check matches either).
//   2. sessionStorage flag — covers F5 mid-recovery, when supabase-js has
//      already cleaned the hash via replaceState on a prior mount.
function detectInitialRecovery(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.href.includes("type=recovery")) return true;
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecovering, setIsRecovering] = useState<boolean>(
    detectInitialRecovery,
  );

  // Mirror isRecovering into sessionStorage so a reload mid-recovery doesn't
  // drop the user back to /dashboard. sessionStorage (not localStorage) so
  // closing the tab is the natural escape from a stuck recovery.
  useEffect(() => {
    try {
      if (isRecovering) {
        sessionStorage.setItem(RECOVERY_KEY, "1");
      } else {
        sessionStorage.removeItem(RECOVERY_KEY);
      }
    } catch {
      // private mode / quota — fall back to in-memory only
    }
  }, [isRecovering]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
      } else if (event === "SIGNED_OUT") {
        setIsRecovering(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const username = session?.user?.user_metadata?.username || "User";

  async function updateUsername(newName: string) {
    await supabase.auth.updateUser({ data: { username: newName } });
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isRecovering,
        setIsRecovering,
        username,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
