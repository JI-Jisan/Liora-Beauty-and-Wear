"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

const handleLogin = async (e) => {
  e.preventDefault();
  setMessage("");

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

          <button type="submit">Login</button>
        </form>

        {message && (
          <p style={{ marginTop: "14px", color: "red", fontWeight: "700" }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}