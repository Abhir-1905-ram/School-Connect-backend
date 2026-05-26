import { Request, Response } from "express";
import dayjs from "dayjs";
import { Payment } from "../models/Payment";
import { Client } from "../models/Client";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import {
  findPartnerByIdOrPartnerId,
  resolvePartnerFromRequest,
} from "../utils/partnerHelpers";

async function buildPaymentFilter(req: Request): Promise<Record<string, unknown>> {
  const filter: Record<string, unknown> = {};
  const { query } = req;

  if (req.user?.role === "partner") {
    const partner = await resolvePartnerFromRequest(req);
    filter.partner = partner._id;
  } else if (query.partnerId) {
    const partner = await findPartnerByIdOrPartnerId(String(query.partnerId));
    if (partner) {
      filter.partner = partner._id;
    }
  }

  if (query.fromDate || query.toDate) {
    filter.paymentDate = {};
    if (query.fromDate) {
      (filter.paymentDate as Record<string, Date>).$gte = new Date(
        String(query.fromDate)
      );
    }
    if (query.toDate) {
      (filter.paymentDate as Record<string, Date>).$lte = dayjs(
        String(query.toDate)
      )
        .endOf("day")
        .toDate();
    }
  }

  return filter;
}

export async function getAllPayments(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = getPagination(req.query);
  const filter = await buildPaymentFilter(req);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("client", "schoolName dealValue paymentStatus")
      .populate({
        path: "partner",
        populate: { path: "user", select: "name email" },
      })
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  ApiResponse.success(res, {
    payments,
    pagination: buildPaginationMeta(total, page, limit),
  });
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  const { clientId, amount, paymentDate, notes } = req.body;

  if (!clientId || amount === undefined) {
    throw new ApiError(400, "clientId and amount are required");
  }

  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  const payment = await Payment.create({
    client: client._id,
    partner: client.partner,
    amount,
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    notes,
    recordedBy: req.user?.id,
  });

  await payment.populate([
    { path: "client", select: "schoolName amountPaid paymentStatus dealValue" },
    {
      path: "partner",
      populate: { path: "user", select: "name email" },
    },
  ]);

  const updatedClient = await Client.findById(client._id);

  ApiResponse.success(
    res,
    { payment, client: updatedClient },
    "Payment recorded",
    201
  );
}

export async function getPaymentStats(
  _req: Request,
  res: Response
): Promise<void> {
  const twelveMonthsAgo = dayjs().subtract(11, "month").startOf("month").toDate();

  const [
    totalRevenueResult,
    clientsOutstanding,
    monthlyCollections,
    revenueByPartner,
  ] = await Promise.all([
    Client.aggregate([
      { $group: { _id: null, total: { $sum: "$amountPaid" } } },
    ]),
    Client.aggregate([
      {
        $project: {
          outstanding: { $subtract: ["$dealValue", "$amountPaid"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$outstanding" } } },
    ]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$paymentDate" },
            month: { $month: "$paymentDate" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Payment.aggregate([
      {
        $group: {
          _id: "$partner",
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $lookup: {
          from: "partners",
          localField: "_id",
          foreignField: "_id",
          as: "partner",
        },
      },
      { $unwind: "$partner" },
      {
        $lookup: {
          from: "users",
          localField: "partner.user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          partnerId: "$partner.partnerId",
          partnerName: "$user.name",
          revenue: 1,
        },
      },
    ]),
  ]);

  const totalRevenue = totalRevenueResult[0]?.total ?? 0;
  const totalOutstanding = Math.max(0, clientsOutstanding[0]?.total ?? 0);

  ApiResponse.success(res, {
    totalRevenue,
    totalOutstanding,
    monthlyCollections: monthlyCollections.map((row) => ({
      month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      amount: row.amount,
    })),
    revenueByPartner,
  });
}
