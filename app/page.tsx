"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  // 🔹 SIGNUP
  async function signup() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Admin account created. Now login.");
  }

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="loginCard">
          <div className="userIcon">👤</div>
          <h1>Admin Login</h1>
          <p style={{ color: "#9aa8bb" }}>Ceylon Dubhe Tracking System</p>

          <input
            placeholder="Admin Email :"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password :"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="btnRow">
            <center></center><button className="primaryBtn" onClick={login}>Login</button>
            <button className="secondaryBtn" onClick={signup}>Signup</button>
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
          <h2>CEYLON <span>DUBHE</span></h2>
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