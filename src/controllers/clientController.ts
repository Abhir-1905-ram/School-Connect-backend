import { Request, Response } from "express";
import { Client, PaymentStatus } from "../models/Client";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import {
  findPartnerByIdOrPartnerId,
  resolvePartnerFromRequest,
} from "../utils/partnerHelpers";

async function buildClientFilter(req: Request): Promise<Record<string, unknown>> {
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

  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.city) {
    filter.city = { $regex: String(query.city), $options: "i" };
  }

  if (query.search) {
    filter.schoolName = { $regex: String(query.search), $options: "i" };
  }

  return filter;
}

async function getClientForRequest(
  req: Request,
  clientId: string
): Promise<InstanceType<typeof Client>> {
  const client = await Client.findById(clientId);

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    if (client.partner.toString() !== partner._id.toString()) {
      throw new ApiError(403, "Access denied to this client");
    }
  }

  await client.populate([
    {
      path: "partner",
      populate: { path: "user", select: "name email" },
    },
    { path: "lead", select: "schoolName status" },
  ]);

  return client;
}

export async function getAllClients(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = getPagination(req.query);
  const filter = await buildClientFilter(req);

  const listQuery = Client.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (req.user?.role === "admin") {
    listQuery.populate({
      path: "partner",
      populate: { path: "user", select: "name email" },
    });
  }

  listQuery.populate("lead", "schoolName status");

  const [clients, total] = await Promise.all([
    listQuery.lean(),
    Client.countDocuments(filter),
  ]);

  ApiResponse.success(res, {
    clients,
    pagination: buildPaginationMeta(total, page, limit),
  });
}

export async function getClient(req: Request, res: Response): Promise<void> {
  const client = await getClientForRequest(req, req.params.id);
  ApiResponse.success(res, { client });
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  const client = await Client.findById(req.params.id);
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    if (client.partner.toString() !== partner._id.toString()) {
      throw new ApiError(403, "Access denied to this client");
    }
  }

  const allowed = [
    "schoolName",
    "address",
    "city",
    "targetClasses",
    "targetTitle",
    "dealValue",
    "notes",
  ] as const;

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      client.set(field, req.body[field]);
    }
  }

  await client.save();
  await client.populate({
    path: "partner",
    populate: { path: "user", select: "name email" },
  });

  ApiResponse.success(res, { client }, "Client updated");
}

export async function updatePaymentStatus(
  req: Request,
  res: Response
): Promise<void> {
  const client = await Client.findById(req.params.id);
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    if (client.partner.toString() !== partner._id.toString()) {
      throw new ApiError(403, "Access denied to this client");
    }
  }

  const { paymentStatus, amountPaid } = req.body as {
    paymentStatus: PaymentStatus;
    amountPaid?: number;
  };

  const validStatuses: PaymentStatus[] = ["paid", "unpaid", "partial"];
  if (!validStatuses.includes(paymentStatus)) {
    throw new ApiError(400, "Invalid payment status");
  }

  client.paymentStatus = paymentStatus;

  if (amountPaid !== undefined) {
    client.amountPaid = amountPaid;
  } else if (paymentStatus === "paid") {
    client.amountPaid = client.dealValue;
  } else if (paymentStatus === "unpaid") {
    client.amountPaid = 0;
  }

  if (client.amountPaid > client.dealValue) {
    throw new ApiError(400, "Amount paid cannot exceed deal value");
  }

  await client.save();

  ApiResponse.success(res, { client }, "Payment status updated");
}
