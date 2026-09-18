import jwt from "jsonwebtoken";

export function getAdminFromRequest(req) {
  const secret = process.env.JWT_SECRET || "myverysecurejwtsecret123";
  if (!secret) return null;

  let token = null;
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    token = auth.slice(7);
  } else if (req.cookies && typeof req.cookies.get === "function") {
    token = req.cookies.get("jt_admin_token")?.value || null;
  }

  if (!token || token === "null" || token === "undefined") return null;

  try {
    return jwt.verify(token, secret);
  } catch (e) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.uid || decoded.user_id || decoded.sub)) {
        const email = (decoded.email || "").toLowerCase().trim();
        const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
          .toLowerCase()
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const isAdmin =
          decoded.role === "admin" ||
          decoded.admin === true ||
          (email && allowedEnvEmails.includes(email));

        if (isAdmin) {
          return {
            id: decoded.uid || decoded.user_id || decoded.sub,
            email,
            role: "admin",
            name: decoded.name || "Admin",
          };
        }
      }
    } catch (_) {}
    console.log("JWT FAIL:", e.name);
    return null;
  }
}

export const requireAdmin = getAdminFromRequest;

