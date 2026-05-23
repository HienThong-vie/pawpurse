import {
  type ReactNode,
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
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
  loginCount: number;
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
  loginCount: 0,
});

//let component access auth data
export function useAuth() {
  return useContext(AuthContext);
}

const RECOVERY_KEY = "smartfinance.isRecovering";
const LAST_SIGNIN_KEY = "smartfinance.lastSignInAt";

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
  // Guard so we don't re-increment login_count while updateUser's USER_UPDATED
  // event echoes back through onAuthStateChange.
  const incrementingRef = useRef(false);

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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
      } else if (event === "SIGNED_OUT") {
        setIsRecovering(false);
        try {
          localStorage.removeItem(LAST_SIGNIN_KEY);
        } catch {
          /* ignore */
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        // Only count a fresh sign-in (not a tab restore / session refresh).
        // Use last_sign_in_at as the dedupe key — it advances on every new
        // sign-in but stays put across refreshes of the same session.
        const lastSeen = (() => {
          try {
            return localStorage.getItem(LAST_SIGNIN_KEY);
          } catch {
            return null;
          }
        })();
        const current = session.user.last_sign_in_at as string | undefined;
        // Signup.tsx sets this flag before calling supabase.auth.signUp so we can
        // reliably skip the increment when Supabase fires SIGNED_IN during signup,
        // avoiding fragile created_at === last_sign_in_at timestamp comparisons.
        const isNewSignup = (() => {
          try {
            return sessionStorage.getItem("smartfinance.newSignup") === "1";
          } catch {
            return false;
          }
        })();
        if (isNewSignup) {
          try {
            sessionStorage.removeItem("smartfinance.newSignup");
          } catch {
            /* ignore */
          }
        }
        if (
          current &&
          current !== lastSeen &&
          !incrementingRef.current &&
          !isNewSignup
        ) {
          incrementingRef.current = true;
          try {
            localStorage.setItem(LAST_SIGNIN_KEY, current);
          } catch {
            /* ignore */
          }
          const currentCount = Number(
            session.user.user_metadata?.login_count ?? 0,
          );
          try {
            await supabase.auth.updateUser({
              data: { login_count: currentCount + 1 },
            });
          } catch {
            // best-effort — we'll try again on next sign-in
          } finally {
            incrementingRef.current = false;
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const username = session?.user?.user_metadata?.username || "User";
  const loginCount = Number(session?.user?.user_metadata?.login_count ?? 0);

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
        loginCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
