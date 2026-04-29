import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col min-h-screen">
        <h1 className="text-orange-500 font_bold text-xl mb-8">
          Smart Finance Tracker
        </h1>
        <nav className="flex flex-col gap-2">
          <ul>
            <li className="p-3">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? "text-orange-500 font-bold" : "text-gray-400"
                }
              >
                Dashboard
              </NavLink>
            </li>
            <li className="p-3">
              <NavLink
                to="/transactions"
                className={({ isActive }) =>
                  isActive ? "text-orange-500 font-bold" : "text-gray-400"
                }
              >
                Transaction
              </NavLink>
            </li>
            <li className="p-3">
              <NavLink
                to="/budget"
                className={({ isActive }) =>
                  isActive ? "text-orange-500 font-bold" : "text-gray-400"
                }
              >
                Budget
              </NavLink>
            </li>
            <li className="p-3">
              <NavLink
                to="/charts"
                className={({ isActive }) =>
                  isActive ? "text-orange-500 font-bold" : "text-gray-400"
                }
              >
                Chart
              </NavLink>
            </li>
            <li className="p-3">
              <NavLink
                to="/advisor"
                className={({ isActive }) =>
                  isActive ? "text-orange-500 font-bold" : "text-gray-400"
                }
              >
                Advice
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="mt-auto">
          <p className="text-gray-400 text-sm p-3">{user?.email}</p>
          <button className="p-3" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
