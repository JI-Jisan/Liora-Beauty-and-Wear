"use client";

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "28px 20px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "14px",
            margin: "20px 0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚠️</div>
          <h3 style={{ margin: "0 0 8px 0", color: "#9f1239", fontSize: "16px", fontWeight: "800" }}>
            এই সেকশনটি প্রদর্শন করতে সমস্যা হয়েছে
          </h3>
          <p style={{ margin: "0 0 16px 0", color: "#be123c", fontSize: "13px" }}>
            {this.state.error?.message || "একটি অনাকাঙ্ক্ষিত ত্রুটি ঘটেছে।"}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: "8px 20px",
              background: "#e11d48",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(225, 29, 72, 0.25)",
            }}
          >
            🔄 আবার চেষ্টা করুন
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
