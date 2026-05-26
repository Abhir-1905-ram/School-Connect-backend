import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { Partner } from "./Partner";

export type PaymentStatus = "unpaid" | "paid" | "partial";

export interface IClient {
  lead: Types.ObjectId;
  schoolName: string;
  address?: string;
  city?: string;
  partner: Types.ObjectId;
  dealValue: number;
  targetClasses?: number[];
  targetTitle?: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  convertedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientDocument extends IClient, Document {}

export interface IClientModel extends Model<IClientDocument> {}

const CLASS_MIN = 1;
const CLASS_MAX = 12;

const clientSchema = new Schema<IClientDocument, IClientModel>(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: [true, "Lead is required"],
      unique: true,
    },
    schoolName: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: [true, "Partner is required"],
    },
    dealValue: {
      type: Number,
      required: [true, "Deal value is required"],
      min: [0, "Deal value cannot be negative"],
    },
    targetClasses: {
      type: [Number],
      validate: {
        validator(classes: number[]) {
          if (!classes?.length) return true;
          return classes.every(
            (c) =>
              Number.isInteger(c) && c >= CLASS_MIN && c <= CLASS_MAX
          );
        },
        message: `Each class must be an integer between ${CLASS_MIN} and ${CLASS_MAX}`,
      },
    },
    targetTitle: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ["unpaid", "paid", "partial"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "unpaid",
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    convertedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

clientSchema.pre("save", function (next) {
  this.$locals.wasNew = this.isNew;
  next();
});

clientSchema.post("save", async function () {
  if (!this.$locals.wasNew) {
    return;
  }

  await Partner.findByIdAndUpdate(this.partner, {
    $inc: {
      totalClients: 1,
      totalRevenue: this.dealValue,
    },
  });
});

clientSchema.index({ partner: 1, createdAt: -1 });
clientSchema.index({ partner: 1, paymentStatus: 1 });

export const Client = mongoose.model<IClientDocument, IClientModel>(
  "Client",
  clientSchema
);
