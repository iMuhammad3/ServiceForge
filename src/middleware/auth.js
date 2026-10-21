
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authenticateToken(req, res, next) {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(503).json({
        status: "error",
        message: "Authentication is not configured",
      });
    }

    const authorization = req.get("authorization");
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        status: "error",
        message: "A valid bearer token is required",
      });
    }

    const payload = jwt.verify(token, secret);

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication token",
      });
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "User account is unavailable",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
}
