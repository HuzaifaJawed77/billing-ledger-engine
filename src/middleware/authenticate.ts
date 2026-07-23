import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { ApiError } from "@/lib/apiError";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role: string;
  };
}

interface JwtPayload {
  sub: string;
  organizationId: string;
  role: string;
}
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or Malformed Authorization header"));
  }
  const token = header.split(" ")[1];
  if (!token) {
    return next(new ApiError(401, "Missing or Malformed Authorization header"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      typeof payload.organizationId !== "string" ||
      typeof payload.role !== "string"
    ) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    req.user = {
      id: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };

    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}
