import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { Client, PaymentStatus } from "./Client";

export interface IPayment {
  client: Types.ObjectId;
  partner: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentDocument extends IPayment, Document {}

export interface IPaymentModel extends Model<IPaymentDocument> {}

function resolvePaymentStatus(
  amountPaid: number,
  dealValue: number
): PaymentStatus {
  if (amountPaid >= dealValue) {
    return "paid";
  }
  if (amountPaid > 0) {
    return "partial";
  }
  return "unpaid";
}

const paymentSchema = new Schema<IPaymentDocument, IPaymentModel>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: [true, "Partner is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

paymentSchema.pre("save", function (next) {
  this.$locals.wasNew = this.isNew;
  next();
});

paymentSchema.post("save", async function () {
  if (!this.$locals.wasNew) {
    return;
  }

  const client = await Client.findById(this.client);
  if (!client) {
    return;
  }

  const amountPaid = client.amountPaid + this.amount;
  const paymentStatus = resolvePaymentStatus(amountPaid, client.dealValue);

  await Client.findByIdAndUpdate(client._id, {
    amountPaid,
    paymentStatus,
  });
});

export const Payment = mongoose.model<IPaymentDocument, IPaymentModel>(
  "Payment",
  paymentSchema
);
