"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/account";

  const { user, role, isAdmin, loading: authLoading, logout } = useAuth();

  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect accordingly
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push(redirectUrl);
      }
    }
  }, [user, role, authLoading, router, redirectUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const translateError = (code) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "ভুল ইমেইল বা পাসওয়ার্ড প্রদান করা হয়েছে।";
      case "auth/invalid-email":
        return "সঠিক ইমেইল অ্যাড্রেস প্রদান করুন।";
      case "auth/email-already-in-use":
        return "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি আছে। অনুগ্রহ করে লগইন করুন।";
      case "auth/weak-password":
        return "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।";
      case "auth/too-many-requests":
        return "অনেকবার ভুল চেষ্টা করা হয়েছে। কিছু সময় পর আবার চেষ্টা করুন।";
      case "auth/popup-closed-by-user":
        return "Google লগইন পপআপ বন্ধ করা হয়েছে।";
      default:
        return "একটি ত্রুটি হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।";
    }
  };

  // Verifies user role on the backend and redirects appropriately
  const handlePostAuthRedirect = async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();

      // If user registered with name or phone, save them
      if (mode === "signup" && (formData.name || formData.phone)) {
        await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
          }),
        }).catch(() => {});
      }

      if (data.role === "admin") {
        if (data.token) {
          localStorage.setItem("jt_admin_logged_in", "true");
          localStorage.setItem("jt_admin_token", data.token);
          localStorage.setItem("jt_admin_user", JSON.stringify(data.user));
        }
        router.push("/admin");
      } else {
        router.push(redirectUrl);
      }
    } catch (err) {
      console.error("Post-auth error:", err);
      router.push(redirectUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const cleanEmail = formData.email.trim();
      const cleanPassword = formData.password;

      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        await handlePostAuthRedirect(cred.user);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        if (formData.name.trim()) {
          await updateProfile(cred.user, { displayName: formData.name.trim() });
        }
        await handlePostAuthRedirect(cred.user);
      }
    } catch (err) {
      console.error(err);
      setError(translateError(err.code || err.message));
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handlePostAuthRedirect(result.user);
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(translateError(err.code || err.message));
      }
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      setError("পাসওয়ার্ড রিসেট করতে অনুগ্রহ করে আপনার ইমেইলটি লিখুন।");
      return;
    }

    setError("");
    setInfo("");
    setBusy(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfo("পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে! ইনবক্স এবং স্প্যাম ফোল্ডার চেক করুন।");
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setBusy(false);
    }
  };

  if (!authLoading && user) {
    return (
      <div style={{ maxWidth: 440, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
        <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>আপনি ইতিমধ্যে লগইন আছেন</h3>
        <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>{user.email}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => router.push(isAdmin ? "/admin" : "/account")}
            style={{ padding: "12px", background: "#0f172a", color: "#fff", borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer" }}
          >
            {isAdmin ? "👑 অ্যাডমিন প্যানেলে যান" : "📦 আমার অ্যাকাউন্টে যান"}
          </button>
          <button
            onClick={logout}
            style={{ padding: "10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, color: "#ef4444", fontWeight: 600, cursor: "pointer" }}
          >
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 440,
        margin: "30px auto 60px",
        padding: "30px 24px",
        background: "#ffffff",
        borderRadius: 20,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.06)",
        border: "1px solid #edf2f7",
      }}
    >
      {/* Brand & Title */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
          Liora Beauty & Wear
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          {mode === "login"
            ? "আপনার অ্যাকাউন্টে লগইন করে অর্ডার হিস্ট্রি ও ট্র্যাকিং দেখুন"
            : "নতুন অ্যাকাউন্ট খুলে সহজেই কেনাকাটা ও অর্ডার ট্র্যাক করুন"}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div
        style={{
          display: "flex",
          background: "#f1f5f9",
          padding: 4,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
            setInfo("");
          }}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            borderRadius: 9,
            background: mode === "login" ? "#ffffff" : "transparent",
            color: mode === "login" ? "#0f172a" : "#64748b",
            fontWeight: mode === "login" ? 800 : 600,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: mode === "login" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s",
          }}
        >
          লগইন (Sign In)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
            setInfo("");
          }}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            borderRadius: 9,
            background: mode === "signup" ? "#ffffff" : "transparent",
            color: mode === "signup" ? "#0f172a" : "#64748b",
            fontWeight: mode === "signup" ? 800 : 600,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: mode === "signup" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s",
          }}
        >
          রেজিস্ট্রেশন (Register)
        </button>
      </div>

      {/* Main Auth Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "signup" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                আপনার পূর্ণ নাম (Full Name)
              </label>
              <input
                type="text"
                name="name"
                placeholder="যেমন: আফরোজা সুলতানা"
                value={formData.name}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                মোবাইল নম্বর (Phone Number)
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="যেমন: 017XXXXXXXX"
                maxLength={11}
                value={formData.phone}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </>
        )}

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
            ইমেইল অ্যাড্রেস (Email Address)
          </label>
          <input
            type="email"
            name="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
            পাসওয়ার্ড (Password)
          </label>
          <input
            type="password"
            name="password"
            placeholder="কমপক্ষে ৬ ডিজিটের পাসওয়ার্ড"
            value={formData.password}
            onChange={handleChange}
            minLength={6}
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {info && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#d1fae5",
              color: "#065f46",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ✓ {info}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 6,
            padding: "13px",
            borderRadius: 10,
            border: "none",
            background: "#e91e63",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(233, 30, 99, 0.3)",
            transition: "all 0.2s",
          }}
        >
          {busy ? "অপেক্ষা করুন..." : mode === "login" ? "লগইন করুন ➔" : "অ্যাকাউন্ট তৈরি করুন ➔"}
        </button>
      </form>

      {/* Forgot Password Link */}
      {mode === "login" && (
        <div style={{ textAlign: "right", marginTop: 10 }}>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            পাসওয়ার্ড ভুলে গেছেন? (Forgot Password)
          </button>
        </div>
      )}

      {/* Divider */}
      <div style={{ margin: "20px 0", textAlign: "center", position: "relative" }}>
        <hr style={{ border: "none", borderTop: "1px solid #e2e8f0" }} />
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            padding: "0 10px",
            color: "#94a3b8",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          অথবা
        </span>
      </div>

      {/* Google Sign-in */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={busy}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#1e293b",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          transition: "all 0.2s",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Google দিয়ে দ্রুত লগইন / রেজিস্টার
      </button>

      {/* Switch Mode Prompt */}
      <div style={{ marginTop: 22, textAlign: "center", fontSize: 13, color: "#64748b" }}>
        {mode === "login" ? (
          <>
            অ্যাকাউন্ট নেই?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setInfo("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#e91e63",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              নতুন অ্যাকাউন্ট খুলুন
            </button>
          </>
        ) : (
          <>
            ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#e91e63",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              লগইন করুন
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <Suspense fallback={<div style={{ textAlign: "center", padding: 50 }}>লোড হচ্ছে...</div>}>
        <LoginFormContent />
      </Suspense>
      <MobileBottomNav />
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};
