import { ProtectedRoute } from "./ProtectedRoute";

function Dashboard() {
  return (
    <div>
      <p>This is temporary</p>
    </div>
  );
}
export const buildDashboard = ProtectedRoute(Dashboard);
