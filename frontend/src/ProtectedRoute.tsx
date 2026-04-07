import { useState, useEffect, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import supabase from "../src/lib/supabaseClient";
//ReactNode means everything React can render: string,int,component...
function ProtectedRoute({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  } else if (!session) {
    return <Navigate to="/login" />;
  } else {
    return <>{children}</>;
  }
}
export default ProtectedRoute;
