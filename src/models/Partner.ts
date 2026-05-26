import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPartner {
  user: Types.ObjectId;
  partnerId: string;
  city: string;
  localArea: string;
  pincode: string;
  designation?: string;
  phone?: string;
  totalLeads: number;
  totalClients: number;
  totalRevenue: number;
  isActive: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPartnerDocument extends IPartner, Document {}

export interface IPartnerModel extends Model<IPartnerDocument> {}

const partnerSchema = new Schema<IPartnerDocument, IPartnerModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      unique: true,
    },
    partnerId: {
      type: String,
      unique: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    localArea: {
      type: String,
      required: [true, "Local area is required"],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
      match: [/^\d{6}$/, "Pincode must be exactly 6 digits"],
    },
    designation: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    totalLeads: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalClients: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

function parsePartnerNumber(partnerId: string): number | null {
  const match = partnerId.match(/^SC-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

partnerSchema.pre("save", async function (next) {
  if (!this.isNew || this.partnerId) {
    return next();
  }

  try {
    const Model = this.constructor as IPartnerModel;
    const partners = await Model.find({ partnerId: /^SC-\d+$/ })
      .select("partnerId")
      .lean();

    let maxNum = 1000;
    for (const partner of partners) {
      const num = parsePartnerNumber(partner.partnerId);
      if (num !== null && num > maxNum) {
        maxNum = num;
      }
    }

    this.partnerId = `SC-${maxNum + 1}`;
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Partner = mongoose.model<IPartnerDocument, IPartnerModel>(
  "Partner",
  partnerSchema
);
