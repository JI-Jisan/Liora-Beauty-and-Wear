export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const getAuthHeaders = (isMultipart = false) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("jt_admin_token") : null;

  const headers = {};

  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};
