import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "./components/layout";
import SetupWizard from "./components/SetupWizard";
import "./App.css";
import { useAuth } from "./context/AuthContext";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Budget = lazy(() => import("./pages/Budget"));
const Advisor = lazy(() => import("./pages/Advisor"));
const Goals = lazy(() => import("./pages/Goals"));
const Companion = lazy(() => import("./pages/Companion"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  const { user, isRecovering, loading } = useAuth();
  const hasCompletedSetup = user?.user_metadata?.has_completed_setup === true;
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 dark:text-[#a0a0a0] font-[Inter]">
        Loading...
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-gray-500 dark:text-[#a0a0a0] font-[Inter]">
          Loading...
        </div>
      }
    >
      {isRecovering && location.pathname !== "/reset-password" ? (
        <Navigate to="/reset-password" replace />
      ) : null}
      {user && !hasCompletedSetup && !isRecovering && location.pathname !== "/signup" && <SetupWizard />}
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/companion" element={<Companion />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
