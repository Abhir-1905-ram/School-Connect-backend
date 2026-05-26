import { Request } from "express";
import mongoose from "mongoose";
import { Partner, IPartnerDocument } from "../models/Partner";
import { ApiError } from "./ApiError";

export async function getPartnerByUserId(
  userId: string
): Promise<IPartnerDocument | null> {
  return Partner.findOne({ user: userId });
}

export async function resolvePartnerFromRequest(
  req: Request
): Promise<IPartnerDocument> {
  if (req.partner) {
    return req.partner;
  }

  if (req.user?.role !== "partner") {
    throw new ApiError(403, "Partner profile required");
  }

  const partner = await getPartnerByUserId(req.user.id);
  if (!partner) {
    throw new ApiError(403, "Partner profile not found");
  }

  req.partner = partner;
  return partner;
}

export function parseObjectId(
  id: string,
  label = "ID"
): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(id);
}

export async function findPartnerByIdOrPartnerId(
  id: string
): Promise<IPartnerDocument | null> {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await Partner.findById(id);
    if (byId) return byId;
  }
  return Partner.findOne({ partnerId: id });
}
