"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setMessage("Invalid email or password. Please check your details and try again.");
      } else if (error.message.includes("Email not confirmed")) {
        setMessage("Please confirm your email before logging in.");
      } else {
        setMessage("Login failed. Please try again.");
      }
      return;
    }

    router.push("/dashboard");
  }

  async function signup() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("User already registered")) {
        setMessage("This email is already registered. Please use the Login button.");
      } else {
        setMessage("Signup failed. Please try again.");
      }
      return;
    }

    // Clear fields after successful signup
    setEmail("");
    setPassword("");

    setMessage(
      "Account created successfully. Please enter your email and password again, then click Login."
    );
  }

  return (
    <>
      <Navbar />

      <main className="page">
        <div className="loginCard">
          <div className="userIcon">👤</div>

          <h1>Admin Login</h1>
          <p>Ceylon Dubhe Tracking System</p>

          <input
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {message && <p className="authMessage">{message}</p>}

          <div className="btnRow">
            <button className="primaryBtn" onClick={login} disabled={loading}>
              {loading ? "Please wait..." : "Login"}
            </button>

            <button className="secondaryBtn" onClick={signup} disabled={loading}>
              {loading ? "Please wait..." : "Signup"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand">
        <div className="logoBox">
          <img src="/logo.png" alt="Dubhe Logo" />
        </div>

        <div className="brandText">
          <h2>
            CEYLON <span>DUBHE</span>
          </h2>
          <p>BUILD • POWER • PERFORM</p>
        </div>
      </div>

      <button
        className="websiteBtn"
        onClick={() => window.open("https://www.ceylondubhe.com", "_blank")}
      >
        GO TO WEBSITE
      </button>
    </nav>
  );
}