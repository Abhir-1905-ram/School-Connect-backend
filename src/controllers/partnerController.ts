import { Request, Response } from "express";
import mongoose from "mongoose";
import dayjs from "dayjs";
import { Partner } from "../models/Partner";
import { User } from "../models/User";
import { Lead } from "../models/Lead";
import { Client } from "../models/Client";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { findPartnerByIdOrPartnerId } from "../utils/partnerHelpers";

function buildPartnerFilter(query: Request["query"]) {
  const filter: Record<string, unknown> = {};

  if (query.city) {
    filter.city = { $regex: String(query.city), $options: "i" };
  }

  if (query.area) {
    filter.localArea = { $regex: String(query.area), $options: "i" };
  }

  return filter;
}

function buildSort(query: Request["query"]): Record<string, 1 | -1> {
  const sortBy = String(query.sortBy ?? "joinedAt");
  const sortMap: Record<string, string> = {
    leads: "totalLeads",
    clients: "totalClients",
    revenue: "totalRevenue",
    joinedAt: "joinedAt",
  };
  const field = sortMap[sortBy] ?? "joinedAt";
  return { [field]: -1 };
}

export async function getAllPartners(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildPartnerFilter(req.query);
  const sort = buildSort(req.query);

  if (req.query.search) {
    const search = String(req.query.search);
    const users = await User.find({
      role: "partner",
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    const userIds = users.map((u) => u._id);
    filter.$or = [
      { partnerId: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { localArea: { $regex: search, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }

  const [partners, total] = await Promise.all([
    Partner.find(filter)
      .populate("user", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Partner.countDocuments(filter),
  ]);

  ApiResponse.success(res, {
    partners,
    pagination: buildPaginationMeta(total, page, limit),
  });
}

export async function getPartner(req: Request, res: Response): Promise<void> {
  const partner = await findPartnerByIdOrPartnerId(req.params.id);
  if (!partner) {
    throw new ApiError(404, "Partner not found");
  }

  await partner.populate("user", "name email role isActive");

  const [leadCount, clientCount] = await Promise.all([
    Lead.countDocuments({ partner: partner._id }),
    Client.countDocuments({ partner: partner._id }),
  ]);

  ApiResponse.success(res, {
    partner,
    leadCount,
    clientCount,
  });
}

export async function createPartner(req: Request, res: Response): Promise<void> {
  const {
    name,
    email,
    password,
    city,
    localArea,
    pincode,
    designation,
    phone,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [user] = await User.create(
      [
        {
          name,
          email,
          password: password ?? "Partner@123",
          role: "partner",
        },
      ],
      { session }
    );

    const [partner] = await Partner.create(
      [
        {
          user: user._id,
          city,
          localArea,
          pincode,
          designation,
          phone,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    await partner.populate("user", "name email");

    ApiResponse.success(res, { partner, user }, "Partner created", 201);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updatePartner(req: Request, res: Response): Promise<void> {
  const partner = await findPartnerByIdOrPartnerId(req.params.id);
  if (!partner) {
    throw new ApiError(404, "Partner not found");
  }

  const allowed = [
    "city",
    "localArea",
    "pincode",
    "designation",
    "phone",
    "isActive",
  ] as const;

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      partner.set(field, req.body[field]);
    }
  }

  await partner.save();
  await partner.populate("user", "name email");

  ApiResponse.success(res, { partner }, "Partner updated");
}

export async function getPartnerStats(req: Request, res: Response): Promise<void> {
  const partner = await findPartnerByIdOrPartnerId(req.params.id);
  if (!partner) {
    throw new ApiError(404, "Partner not found");
  }

  const sixMonthsAgo = dayjs().subtract(5, "month").startOf("month").toDate();

  const [leadCount, clientCount, leadsByMonth] = await Promise.all([
    Lead.countDocuments({ partner: partner._id }),
    Client.countDocuments({ partner: partner._id }),
    Lead.aggregate([
      {
        $match: {
          partner: partner._id,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const convertedLeads = await Lead.countDocuments({
    partner: partner._id,
    status: "converted",
  });

  const conversionRate =
    leadCount > 0 ? Math.round((convertedLeads / leadCount) * 10000) / 100 : 0;

  const formattedLeadsByMonth = leadsByMonth.map((row) => ({
    month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
    count: row.count,
  }));

  ApiResponse.success(res, {
    totalLeads: leadCount,
    totalClients: clientCount,
    totalRevenue: partner.totalRevenue,
    leadsByMonth: formattedLeadsByMonth,
    conversionRate,
  });
}
