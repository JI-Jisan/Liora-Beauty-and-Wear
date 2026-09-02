import jwt from "jsonwebtoken";

export function getAdminFromRequest(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  let token = null;
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    token = auth.slice(7);
  } else if (req.cookies && typeof req.cookies.get === "function") {
    token = req.cookies.get("jt_admin_token")?.value || null;
  }

  if (!token) return null;

  try {
    return jwt.verify(token, secret);
  } catch (e) {
    console.log("JWT FAIL:", e.name);
    return null;
  }
}

export const requireAdmin = getAdminFromRequest;

