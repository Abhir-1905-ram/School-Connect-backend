import { Request, Response } from "express";
import dayjs from "dayjs";
import { Lead } from "../models/Lead";
import { Client } from "../models/Client";
import { Partner } from "../models/Partner";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { resolvePartnerFromRequest } from "../utils/partnerHelpers";

export async function getPartnerDashboardStats(
  req: Request,
  res: Response
): Promise<void> {
  if (req.user?.role !== "partner") {
    throw new ApiError(403, "Partner access required");
  }

  const partner = await resolvePartnerFromRequest(req);
  const partnerId = partner._id;
  const sixMonthsAgo = dayjs().subtract(5, "month").startOf("month").toDate();

  const [
    recentLeads,
    monthlyLeadTrend,
    statusBreakdown,
    pendingPayments,
    partnerProfile,
  ] = await Promise.all([
    Lead.find({ partner: partnerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("schoolName status dealValue createdAt city")
      .lean(),
    Lead.aggregate([
      {
        $match: {
          partner: partnerId,
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
    Lead.aggregate([
      { $match: { partner: partnerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Client.countDocuments({
      partner: partnerId,
      paymentStatus: { $in: ["unpaid", "partial"] },
    }),
    Partner.findById(partnerId).populate("user", "name email").lean(),
  ]);

  const statusMap = Object.fromEntries(
    statusBreakdown.map((row) => [row._id as string, row.count as number])
  );

  ApiResponse.success(res, {
    partner: partnerProfile,
    recentLeads,
    pendingPayments,
    monthlyLeadTrend: monthlyLeadTrend.map((row) => ({
      month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      count: row.count,
    })),
    leadStats: {
      total: partner.totalLeads,
      inProgress:
        (statusMap.in_progress ?? 0) + (statusMap.negotiating ?? 0),
      converted: statusMap.converted ?? 0,
      new: statusMap.new ?? 0,
      lost: statusMap.lost ?? 0,
    },
  });
}
