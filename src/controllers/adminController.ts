import { Request, Response } from "express";
import dayjs from "dayjs";
import { Partner } from "../models/Partner";
import { Lead } from "../models/Lead";
import { Client } from "../models/Client";
import { Payment } from "../models/Payment";
import { ApiResponse } from "../utils/ApiResponse";

export async function getDashboardStats(
  _req: Request,
  res: Response
): Promise<void> {
  const twelveMonthsAgo = dayjs().subtract(11, "month").startOf("month").toDate();

  const [
    totalPartners,
    totalLeads,
    totalClients,
    revenueResult,
    leadsByCity,
    partnerStats,
    recentLeads,
    recentClients,
    recentPayments,
    monthlyLeadTrend,
  ] = await Promise.all([
    Partner.countDocuments({ isActive: true }),
    Lead.countDocuments(),
    Client.countDocuments(),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Lead.aggregate([
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, city: "$_id", count: 1 } },
    ]),
    Partner.find()
      .populate("user", "name email")
      .select("partnerId totalLeads totalClients totalRevenue user")
      .lean(),
    Lead.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("schoolName status createdAt city")
      .lean(),
    Client.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("schoolName paymentStatus createdAt dealValue")
      .lean(),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("client", "schoolName")
      .select("amount paymentDate createdAt client")
      .lean(),
    Lead.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
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

  const totalRevenue = revenueResult[0]?.total ?? 0;

  const partnerLeaderboard = partnerStats
    .map((p) => ({
      partner: {
        id: p._id,
        partnerId: p.partnerId,
        name: (p.user as { name?: string })?.name,
        email: (p.user as { email?: string })?.email,
      },
      leadCount: p.totalLeads,
      clientCount: p.totalClients,
      revenue: p.totalRevenue,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.clientCount - a.clientCount)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const recentActivity = [
    ...recentLeads.map((lead) => ({
      type: "lead" as const,
      description: `New lead: ${lead.schoolName} (${lead.status}) — ${lead.city}`,
      timestamp: lead.createdAt,
    })),
    ...recentClients.map((client) => ({
      type: "client" as const,
      description: `New client: ${client.schoolName} — ${client.paymentStatus}`,
      timestamp: client.createdAt,
    })),
    ...recentPayments.map((payment) => ({
      type: "payment" as const,
      description: `Payment ₹${payment.amount} for ${
        (payment.client as { schoolName?: string })?.schoolName ?? "client"
      }`,
      timestamp: payment.paymentDate ?? payment.createdAt,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 15);

  ApiResponse.success(res, {
    totalPartners,
    totalLeads,
    totalClients,
    totalRevenue,
    leadsByCity,
    partnerLeaderboard,
    recentActivity,
    monthlyLeadTrend: monthlyLeadTrend.map((row) => ({
      month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      count: row.count,
    })),
  });
}
