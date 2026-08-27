import jwt from "jsonwebtoken";

export function getAdminFromRequest(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const auth = req.headers.get("authorization") || "";
  let token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) token = req.cookies?.get?.("adminToken")?.value || null;
  if (!token) return null;

  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
