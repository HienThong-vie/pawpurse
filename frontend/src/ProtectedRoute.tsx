import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import SetupWizard from "./components/SetupWizard";
//ReactNode means everything React can render: string,int,component...
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { user } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  } else if (!session) {
    return <Navigate to="/login" />;
  } else if (!user?.user_metadata?.has_completed_setup) {
    return <SetupWizard />;
  } else {
    return <>{children}</>;
  }
}
export default ProtectedRoute;
