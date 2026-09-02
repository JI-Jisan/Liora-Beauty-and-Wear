"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const translate = (code) =>
    ({
      "auth/invalid-credential": "ইমেইল বা পাসওয়ার্ড ভুল",
      "auth/invalid-email": "ইমেইল ঠিক নয়",
      "auth/email-already-in-use": "এই ইমেইলে অ্যাকাউন্ট আছে, লগইন করুন",
      "auth/weak-password": "পাসওয়ার্ড অন্তত ৬ অক্ষর দিন",
      "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর আবার করুন",
      "auth/popup-closed-by-user": "",
    }[code] || "সমস্যা হয়েছে, আবার চেষ্টা করুন");

  async function run(fn) {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(translate(e.code));
    } finally {
      setBusy(false);
    }
  }

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      }
      router.push("/account/orders");
    });
  };

  const google = () =>
    run(async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/account/orders");
    });

  const reset = () =>
    run(async () => {
      if (!email.trim()) throw { code: "auth/invalid-email" };
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে। স্প্যাম ফোল্ডারও দেখুন।");
    });

  return (
    <div style={{ maxWidth: 380, margin: "40px auto", padding: 16 }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        {mode === "login" ? "লগইন" : "নতুন অ্যাকাউন্ট"}
      </h2>

      <form onSubmit={submit}>
        {mode === "signup" && (
          <input
            placeholder="আপনার নাম"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
        )}
        <input
          type="email"
          placeholder="ইমেইল"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inp}
        />
        <input
          type="password"
          placeholder="পাসওয়ার্ড"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inp}
        />

        {error && <p style={{ color: "#c00", fontSize: 14 }}>{error}</p>}
        {info && <p style={{ color: "#0a7", fontSize: 14 }}>{info}</p>}

        <button type="submit" disabled={busy} style={btn}>
          {busy ? "অপেক্ষা করুন..." : mode === "login" ? "লগইন" : "অ্যাকাউন্ট খুলুন"}
        </button>
      </form>

      <button onClick={google} disabled={busy} style={{ ...btn, background: "#fff", color: "#333", border: "1px solid #ddd" }}>
        Google দিয়ে লগইন
      </button>

      {mode === "login" && (
        <button onClick={reset} disabled={busy} style={link}>
          পাসওয়ার্ড ভুলে গেছেন?
        </button>
      )}

      <button
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
        style={link}
      >
        {mode === "login" ? "অ্যাকাউন্ট নেই? খুলুন" : "অ্যাকাউন্ট আছে? লগইন করুন"}
      </button>
    </div>
  );
}

const inp = { width: "100%", padding: 12, marginBottom: 10, borderRadius: 8, border: "1px solid #ddd", boxSizing: "border-box" };
const btn = { width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "none", background: "#e91e63", color: "#fff", fontWeight: 600, cursor: "pointer" };
const link = { width: "100%", background: "none", border: "none", color: "#666", marginTop: 12, cursor: "pointer", fontSize: 14 };
