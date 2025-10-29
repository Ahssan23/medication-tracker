import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed 🚫");
        return;
      }

      // ✅ Save correct user object with _id
      localStorage.setItem("token", data.token);
      localStorage.setItem("auth", JSON.stringify(data.user));
      console.log("Saved token:", data.token);
      navigate("/home");
    } catch (err) {
      alert("Server error 😢");
      console.error(err);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        <div className="auth-links">
          <span onClick={() => navigate("/signup")}>
            Don’t have an account? Sign up
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
