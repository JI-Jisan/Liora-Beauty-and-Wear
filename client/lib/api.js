export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const getImageUrl = (img) => {
  if (!img) return "";
  if (
    img.startsWith("http://") ||
    img.startsWith("https://") ||
    img.startsWith("data:image")
  ) {
    return img;
  }
  if (img.startsWith("/uploads")) {
    return `${API_BASE_URL}${img}`;
  }
  if (img.startsWith("uploads/")) {
    return `${API_BASE_URL}/${img}`;
  }
  if (img.startsWith("/")) {
    return img;
  }
  return `/images/${img}`;
};

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
