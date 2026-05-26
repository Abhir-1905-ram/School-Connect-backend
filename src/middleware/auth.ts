import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { Partner, IPartnerDocument } from "../models/Partner";

export type UserRole = "admin" | "partner";

export interface JwtPayload {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      partner?: IPartnerDocument;
    }
  }
}

export function verifyToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required"));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required"));
  }

  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }

  next();
}

export function requirePartner(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required"));
  }

  if (req.user.role !== "partner") {
    return next(new ApiError(403, "Partner access required"));
  }

  next();
}

interface RequireOwnershipOptions {
  /** Request field holding Partner _id or partnerId (e.g. SC-1001) */
  paramField?: string;
  source?: "params" | "body" | "query";
}

export function requireOwnership(options: RequireOwnershipOptions = {}) {
  const { paramField = "partnerId", source = "params" } = options;

  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (req.user.role === "admin") {
      return next();
    }

    if (req.user.role !== "partner") {
      return next(new ApiError(403, "Insufficient permissions"));
    }

    const partner = await Partner.findOne({ user: req.user.id });
    if (!partner) {
      return next(new ApiError(403, "Partner profile not found"));
    }

    const container =
      source === "params"
        ? req.params
        : source === "body"
          ? req.body
          : req.query;

    const resourceId = container[paramField] as string | undefined;

    if (!resourceId) {
      return next(new ApiError(400, "Partner resource identifier is required"));
    }

    const ownsResource =
      partner._id.toString() === resourceId || partner.partnerId === resourceId;

    if (!ownsResource) {
      return next(new ApiError(403, "Access denied to this resource"));
    }

    req.partner = partner;
    next();
  };
}

/** @deprecated Use verifyToken */
export const authenticate = verifyToken;
