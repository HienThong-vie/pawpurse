import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
function Signup() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const navigate = useNavigate();
  async function Signing() {
    if (confirmPassword !== password) {
      alert("Passwords do not match!");
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else if (!error) {
      alert("Account created! Please log in.");
      navigate("/login");
    }
  }
  return (
    <div className=" bg-yellow-50 min-h-screen flex items-center justify-center">
      <div className="bg-yellow-50 w-100 border border-gray-700 flex flex-col items-center justify-center gap-4">
        <h1 className="text-orange-500 align-middle font-bold">
          Smart Finance Tracker
        </h1>
        <h2 className=" text-black align-middle font-bold">
          {" "}
          Create your account{" "}
        </h2>
        <input
          className="bg-gray-800 text-white rounded-lg p-3 w-70"
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="bg-gray-800 text-white rounded-lg p-3 w-70"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="bg-gray-800 text-white rounded-lg p-3 w-70"
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          onClick={() => Signing()}
          className="bg-orange-500 text-white rounded-lg p-3 w-50 font-bold"
        >
          Sign in
        </button>
        <p>
          {" "}
          Already have an account? {""}
          <Link className="text-red-500" to="/login">
            Login
          </Link>
          {""} here
        </p>
      </div>
    </div>
  );
}
export default Signup;
