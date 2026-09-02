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
            {busy ? "অপেক্ষা করুন..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "14px", textAlign: "center" }}>
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