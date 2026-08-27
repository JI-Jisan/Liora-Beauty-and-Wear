import jwt from "jsonwebtoken";

export function getAdminFromRequest(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;

  try {
    return jwt.verify(auth.slice(7), secret);
  } catch (e) {
    console.log("JWT FAIL:", e.name);
    return null;
  }
}
