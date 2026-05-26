import { Request, Response } from "express";
import dayjs from "dayjs";
import { Lead } from "../models/Lead";
import { Client } from "../models/Client";
import { Partner } from "../models/Partner";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import {
  findPartnerByIdOrPartnerId,
  resolvePartnerFromRequest,
} from "../utils/partnerHelpers";

async function buildLeadFilterAsync(req: Request): Promise<Record<string, unknown>> {
  const filter: Record<string, unknown> = {};
  const { query } = req;

  if (req.user?.role === "partner") {
    const partner = req.partner ?? (await resolvePartnerFromRequest(req));
    filter.partner = partner._id;
  } else if (query.partnerId) {
    const partner = await findPartnerByIdOrPartnerId(String(query.partnerId));
    if (partner) {
      filter.partner = partner._id;
    }
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.city) {
    filter.city = { $regex: String(query.city), $options: "i" };
  }

  if (query.search) {
    filter.schoolName = { $regex: String(query.search), $options: "i" };
  }

  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(
        String(query.fromDate)
      );
    }
    if (query.toDate) {
      (filter.createdAt as Record<string, Date>).$lte = dayjs(
        String(query.toDate)
      )
        .endOf("day")
        .toDate();
    }
  }

  return filter;
}

async function getLeadForRequest(
  req: Request,
  leadId: string
): Promise<InstanceType<typeof Lead>> {
  const lead = await Lead.findById(leadId);

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    if (lead.partner.toString() !== partner._id.toString()) {
      throw new ApiError(403, "Access denied to this lead");
    }
  }

  await lead.populate({
    path: "partner",
    populate: { path: "user", select: "name email" },
  });

  return lead;
}

export async function getAllLeads(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = getPagination(req.query);
  const filter = await buildLeadFilterAsync(req);

  const listQuery = Lead.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (req.user?.role === "admin") {
    listQuery.populate({
      path: "partner",
      populate: { path: "user", select: "name email" },
    });
  }

  const [leads, total] = await Promise.all([
    listQuery.lean(),
    Lead.countDocuments(filter),
  ]);

  ApiResponse.success(res, {
    leads,
    pagination: buildPaginationMeta(total, page, limit),
  });
}

export async function getLead(req: Request, res: Response): Promise<void> {
  const lead = await getLeadForRequest(req, req.params.id);
  ApiResponse.success(res, { lead });
}

export async function createLead(req: Request, res: Response): Promise<void> {
  const partner = await resolvePartnerFromRequest(req);

  const {
    schoolName,
    description,
    address,
    city,
    localArea,
    pincode,
    targetTitle,
    targetClasses,
    dealValue,
    notes,
  } = req.body;

  const lead = await Lead.create({
    schoolName,
    description,
    address,
    city,
    localArea,
    pincode,
    targetTitle,
    targetClasses,
    dealValue,
    notes,
    partner: partner._id,
  });

  await Partner.findByIdAndUpdate(partner._id, { $inc: { totalLeads: 1 } });

  await lead.populate({
    path: "partner",
    populate: { path: "user", select: "name email" },
  });

  ApiResponse.success(res, { lead }, "Lead created", 201);
}

export async function updateLead(req: Request, res: Response): Promise<void> {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    if (lead.partner.toString() !== partner._id.toString()) {
      throw new ApiError(403, "Access denied to this lead");
    }
  }

  const allowed = [
    "schoolName",
    "description",
    "address",
    "city",
    "localArea",
    "pincode",
    "targetTitle",
    "targetClasses",
    "dealValue",
    "status",
    "notes",
  ] as const;

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      lead.set(field, req.body[field]);
    }
  }

  await lead.save();
  await lead.populate({
    path: "partner",
    populate: { path: "user", select: "name email" },
  });

  ApiResponse.success(res, { lead }, "Lead updated");
}

export async function convertToClient(req: Request, res: Response): Promise<void> {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    if (lead.partner.toString() !== partner._id.toString()) {
      throw new ApiError(403, "Access denied to this lead");
    }
  }

  if (lead.status === "converted") {
    throw new ApiError(400, "Lead is already converted");
  }

  const existingClient = await Client.findOne({ lead: lead._id });
  if (existingClient) {
    throw new ApiError(400, "A client already exists for this lead");
  }

  const client = await Client.create({
    lead: lead._id,
    schoolName: lead.schoolName,
    address: lead.address,
    city: lead.city,
    partner: lead.partner,
    dealValue: lead.dealValue,
    targetClasses: lead.targetClasses,
    targetTitle: lead.targetTitle,
    notes: lead.notes,
  });

  lead.status = "converted";
  lead.convertedAt = new Date();
  await lead.save();

  ApiResponse.success(
    res,
    { lead, client },
    "Lead converted to client",
    201
  );
}

export async function deleteLead(req: Request, res: Response): Promise<void> {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (lead.status === "converted") {
    throw new ApiError(400, "Cannot delete a converted lead");
  }

  await Partner.findByIdAndUpdate(lead.partner, { $inc: { totalLeads: -1 } });
  await lead.deleteOne();

  ApiResponse.success(res, null, "Lead deleted");
}
