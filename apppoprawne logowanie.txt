import React, { useEffect, useState } from "react";
import "./App.css";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "./firebase-config";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Tips from "./pages/Tips";
import Login from "./pages/Login";
import PlansPage from "./pages/PlansPage";
import Dashboard from "./pages/dashboard";
import DownloadsBasic from "./pages/DownloadsBasic";
import DownloadsPremium from "./pages/DownloadsPremium";

function MainPage({ user, loginWithGoogle, logout, subscribe }) {
  const navigate = useNavigate();

  const handleSubscribe = async (plan) => {
    if (!user) {
      localStorage.setItem("selectedPlan", plan);
      navigate("/login");
      return;
    }

    const isSubscribed = await checkSubscription(user.email);
    if (isSubscribed) {
      navigate("/dashboard");
    } else if (user.emailVerified) {
      subscribe(plan);
    } else {
      alert("Please verify your email before subscribing.");
    }
  };

  const checkSubscription = async (email) => {
    const res = await fetch("https://foxorox-backend.onrender.com/check-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    return data.active;
  };

  return (
    <div className="main-container">
      <header className="hero">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {user ? (
            <button className="google-btn" onClick={logout}>
              Sign out
            </button>
          ) : (
            <button
              className="google-btn"
              onClick={() =>
                (window.location.href = "https://foxorox-frontend.vercel.app/login")
              }
            >
              Sign in
            </button>
          )}
        </div>

        <img src="/logo-foxorox.png" alt="Foxorox Logo" className="logo" />
        <h1>
          Welcome to <span className="highlight">Foxorox</span>
        </h1>
        <p className="subtitle">
          AI-powered stock insights. Driven by 35+ years of trading experience.
        </p>

        <h3 style={{ color: "#fff", fontSize: "1.5em", marginBottom: "30px" }}>
          Choose your plan:
        </h3>

        <div className="plans-grid">
          <div className="plan-card">
            <h2>🟢 Basic US Monthly</h2>
            <p>Basic AI predictions for NASDAQ100 & S&P 500.</p>
            <button onClick={() => handleSubscribe("basic_monthly")}>
              Subscribe – $79.99
            </button>
          </div>

          <div className="plan-card">
            <h2>🔵 Basic US Yearly</h2>
            <p>One year of access to US market predictions.</p>
            <button onClick={() => handleSubscribe("basic_yearly")}>
              Subscribe – $790.00
            </button>
          </div>

          <div className="plan-card">
            <h2>🟠 Global Monthly</h2>
            <p>Global markets with Markov models + AI.</p>
            <button onClick={() => handleSubscribe("global_monthly")}>
              Subscribe – $129.99
            </button>
          </div>

          <div className="plan-card">
            <h2>🔴 Global Yearly</h2>
            <p>Full year premium insights worldwide.</p>
            <button onClick={() => handleSubscribe("global_yearly")}>
              Subscribe – $1290.00
            </button>
          </div>
        </div>
      </header>
    </div>
</div> {/* <-- plans-grid koniec */}


<footer style={{ backgroundColor: "#111", color: "#ccc", padding: "40px 20px", marginTop: 60 }}>
  <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color: "#fff" }}>Foxorox</h3>
      <p style={{ maxWidth: 300 }}>
        AI-powered stock market predictions. Backed by decades of real trading experience.
      </p>
    </div>

    <div>
      <h4 style={{ color: "#fff" }}>Company</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li><a href="/about" style={{ color: "#ccc", textDecoration: "none" }}>About</a></li>
        <li><a href="/faq" style={{ color: "#ccc", textDecoration: "none" }}>FAQ</a></li>
        <li><a href="/contact" style={{ color: "#ccc", textDecoration: "none" }}>Contact</a></li>
        <li><a href="/terms" style={{ color: "#ccc", textDecoration: "none" }}>Terms of Use</a></li>
        <li><a href="/privacy" style={{ color: "#ccc", textDecoration: "none" }}>Privacy Policy</a></li>
      </ul>
    </div>

    <div>
      <h4 style={{ color: "#fff" }}>Contact Us</h4>
      <p>Email: <a href="mailto:support@foxorox.ai" style={{ color: "#ccc" }}>support@foxorox.ai</a></p>
      <p>Support hours: Mon–Fri, 9AM–5PM (CET)</p>
    </div>
  </div>

  <div style={{ textAlign: "center", marginTop: 40, fontSize: 14 }}>
    &copy; {new Date().getFullYear()} Foxorox. All rights reserved.
  </div>
</footer>

</div>  {/* ← to już było wcześniej */}

  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();

  const subscribe = (plan) => {
    if (!user || !user.email) {
      alert("Error: No user email found.");
      return;
    }

    fetch("https://foxorox-backend.onrender.com/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email: user.email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Error: No Stripe URL returned.");
          console.error("Stripe response:", data);
        }
      })
      .catch((err) => {
        alert("Server error during subscription.");
        console.error("Stripe error:", err);
      });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      const plan = localStorage.getItem("selectedPlan");

      if (usr && plan) {
        if (usr.emailVerified) {
          localStorage.removeItem("selectedPlan");
          subscribe(plan);
        } else {
          alert("Please verify your email before subscribing.");
          navigate("/plans");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = () => {
    signInWithPopup(auth, provider)
      .then(() => {})
      .catch((error) => alert("Login error: " + error.message));
  };

  const logout = () => {
    signOut(auth).then(() => navigate("/"));
  };

  if (user === undefined) return <div style={{ color: "white" }}>Loading...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainPage
            user={user}
            loginWithGoogle={loginWithGoogle}
            logout={logout}
            subscribe={subscribe}
          />
        }
      />

      <Route path="/login" element={<Login onSuccess={() => navigate("/plans")} />} />

      <Route
        path="/dashboard"
        element={user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />}
      />

      <Route
        path="/downloads/basic"
        element={user ? <DownloadsBasic user={user} /> : <Navigate to="/login" />}
      />

      <Route
        path="/downloads/premium"
        element={user ? <DownloadsPremium user={user} /> : <Navigate to="/login" />}
      />

      <Route
        path="/plans"
        element={
          user ? (
            <PlansPage user={user} logout={logout} subscribe={subscribe} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route path="/tips" element={<Tips />} />
    </Routes>
  );
}

export default App;
