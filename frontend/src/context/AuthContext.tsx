import {
  ReactNode,
  createContext,
  useState,
  useEffect,
  useContext,
} from "react";
import supabase from "../lib/supabaseClient";

//container holds the shape of data that will be shared globally
export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
});

//let component access auth data
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
