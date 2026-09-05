"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthCtx = createContext({
  user: null,
  role: null,
  isAdmin: false,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserWithBackend = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setRole(null);
      setProfile(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("jt_admin_token");
        localStorage.removeItem("jt_admin_logged_in");
        localStorage.removeItem("jt_admin_user");
      }
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken(true);
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRole(data.role || "user");
        setProfile(data.user || null);

        if (data.role === "admin" && data.token) {
          localStorage.setItem("jt_admin_logged_in", "true");
          localStorage.setItem("jt_admin_token", data.token);
          localStorage.setItem("jt_admin_user", JSON.stringify(data.user));
        } else {
          // If not admin, ensure admin token is clean
          localStorage.removeItem("jt_admin_token");
          localStorage.removeItem("jt_admin_logged_in");
          localStorage.removeItem("jt_admin_user");
        }
      } else {
        setRole("user");
      }
    } catch (err) {
      console.error("Auth sync error:", err);
      setRole("user");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await syncUserWithBackend(u);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserWithBackend]);

  const logout = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("jt_admin_token");
        localStorage.removeItem("jt_admin_logged_in");
        localStorage.removeItem("jt_admin_user");
      }
      setUser(null);
      setRole(null);
      setProfile(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncUserWithBackend(auth.currentUser);
    }
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        role,
        isAdmin: role === "admin",
        profile,
        loading,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

// Helper function for API calls
export async function getIdToken() {
  return auth.currentUser ? await auth.currentUser.getIdToken() : null;
}
