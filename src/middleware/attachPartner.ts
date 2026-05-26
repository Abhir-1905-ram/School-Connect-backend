import { Request, Response, NextFunction } from "express";
import { getPartnerByUserId } from "../utils/partnerHelpers";
import { ApiError } from "../utils/ApiError";

export async function attachPartner(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.role === "partner") {
    const partner = await getPartnerByUserId(req.user.id);
    if (!partner) {
      return next(new ApiError(403, "Partner profile not found"));
    }
    req.partner = partner;
  }
  next();
}
