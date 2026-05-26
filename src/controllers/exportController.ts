import { Request, Response } from "express";
import dayjs from "dayjs";
import { Lead } from "../models/Lead";
import { Payment } from "../models/Payment";
function escapeCsvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}

export async function exportLeadsCsv(_req: Request, res: Response): Promise<void> {
  const leads = await Lead.find({})
    .populate({
      path: "partner",
      populate: { path: "user", select: "name email" },
    })
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    "School Name",
    "City",
    "Status",
    "Deal Value",
    "Target Classes",
    "Partner",
    "Created At",
  ];

  const rows = leads.map((lead) => {
    const partner = lead.partner as {
      partnerId?: string;
      user?: { name?: string };
    } | null;
    const partnerLabel =
      partner?.user?.name ?? partner?.partnerId ?? "—";

    return [
      lead.schoolName,
      lead.city,
      lead.status,
      String(lead.dealValue),
      (lead.targetClasses ?? []).join("; "),
      partnerLabel,
      dayjs(lead.createdAt).format("YYYY-MM-DD"),
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `school-connect-leads-${dayjs().format("YYYY-MM-DD")}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv);
}

export async function exportPaymentsCsv(
  _req: Request,
  res: Response
): Promise<void> {
  const payments = await Payment.find({})
    .populate("client", "schoolName dealValue")
    .populate({
      path: "partner",
      populate: { path: "user", select: "name" },
    })
    .sort({ paymentDate: -1 })
    .lean();

  const headers = [
    "School",
    "Amount",
    "Payment Date",
    "Partner",
    "Notes",
    "Recorded At",
  ];

  const rows = payments.map((p) => {
    const client = p.client as { schoolName?: string } | null;
    const partner = p.partner as { user?: { name?: string } } | null;
    return [
      client?.schoolName ?? "—",
      String(p.amount),
      dayjs(p.paymentDate).format("YYYY-MM-DD"),
      partner?.user?.name ?? "—",
      p.notes ?? "",
      dayjs(p.createdAt).format("YYYY-MM-DD HH:mm"),
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `school-connect-payments-${dayjs().format("YYYY-MM-DD")}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv);
}
