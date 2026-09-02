"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccessInfo("");
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Login failed");
      }

      localStorage.setItem("jt_admin_logged_in", "true");
      localStorage.setItem("jt_admin_token", result.token);
      localStorage.setItem("jt_admin_user", JSON.stringify(result.admin));

      router.push("/admin");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage("");
    setSuccessInfo("");
    setBusy(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const res = await fetch(`${API_BASE_URL}/api/admin/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Google লগইন ব্যর্থ হয়েছে");
      }

      localStorage.setItem("jt_admin_logged_in", "true");
      localStorage.setItem("jt_admin_token", data.token);
      localStorage.setItem("jt_admin_user", JSON.stringify(data.admin));

      router.push("/admin");
    } catch (err) {
      console.error("Admin Google login error:", err);
      setMessage(err.message || "Google দিয়ে লগইন করা সম্ভব হয়নি");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setMessage("পাসওয়ার্ড রিসেট করতে আগে আপনার ইমেইলটি লিখুন।");
      return;
    }

    setMessage("");
    setSuccessInfo("");
    setBusy(true);

    try {
      await sendPasswordResetEmail(auth, formData.email.trim());
      setSuccessInfo("পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে! ইনবক্স ও স্প্যাম ফোল্ডার চেক করুন।");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setMessage("এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।");
      } else if (err.code === "auth/invalid-email") {
        setMessage("সঠিক ইমেইল অ্যাড্রেস লিখুন।");
      } else {
        setMessage("পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="jt-admin-page">
      <div className="jt-admin-login-box">
        <h1>Admin Login</h1>
        <p>Please login to access the admin dashboard.</p>

        <form className="jt-admin-form" onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            placeholder="Admin email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={busy}>
            {busy ? "অপেক্ষা করুন..." : "Login with Email"}
          </button>
        </form>

        <div style={{ margin: "14px 0", textAlign: "center", position: "relative" }}>
          <span style={{ background: "#fff", padding: "0 10px", color: "#888", fontSize: "12px", fontWeight: "bold" }}>
            অথবা
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#1e293b",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google দিয়ে অ্যাডমিন লগইন
        </button>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              color: "#e91e63",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            পাসওয়ার্ড ভুলে গেছেন? (Forgot Password)
          </button>
        </div>

        {message && (
          <p style={{ marginTop: "14px", color: "red", fontWeight: "700", textAlign: "center", fontSize: "14px" }}>
            {message}
          </p>
        )}

        {successInfo && (
          <p style={{ marginTop: "14px", color: "#16a34a", fontWeight: "700", textAlign: "center", fontSize: "14px" }}>
            {successInfo}
          </p>
        )}
      </div>
    </main>
  );
}