import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  //asign the async allow function to use await
  async function Logging() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }); // await till the supabase get user email and password, otherwise they are empty
    if (error) {
      alert(error.message);
    } else if (!error) {
      navigate("/dashboard");
    }
  }

  return (
    <div className=" bg-yellow-50 min-h-screen flex items-center justify-center">
      <div className="bg-yellow-50 w-100 h-100 border border-gray-700 flex flex-col items-center justify-center gap-4">
        <h1 className="text-orange-500 align-middle font-bold">
          Smart Finance Tracker
        </h1>
        <h2 className=" text-black align-middle font-bold"> Welcome back </h2>
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
        <button
          onClick={() => Logging()}
          className="bg-orange-500 text-white rounded-lg p-3 w-50 font-bold"
        >
          Sign in
        </button>
        <p>
          {" "}
          Don't have an account? {""}
          <Link className="text-red-500" to="/signup">
            Sign Up
          </Link>
          {""} here
        </p>
      </div>
    </div>
  );
}

export default Login;
