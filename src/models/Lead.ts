import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type LeadStatus =
  | "new"
  | "in_progress"
  | "negotiating"
  | "converted"
  | "lost";

export interface ILead {
  schoolName: string;
  description?: string;
  address: string;
  city: string;
  localArea?: string;
  pincode?: string;
  targetTitle: string;
  targetClasses: number[];
  dealValue: number;
  status: LeadStatus;
  partner: Types.ObjectId;
  convertedAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeadDocument extends ILead, Document {}

export interface ILeadModel extends Model<ILeadDocument> {}

const CLASS_MIN = 1;
const CLASS_MAX = 12;

const leadSchema = new Schema<ILeadDocument, ILeadModel>(
  {
    schoolName: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    localArea: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    targetTitle: {
      type: String,
      required: [true, "Target title is required"],
      trim: true,
    },
    targetClasses: {
      type: [Number],
      required: [true, "Target classes are required"],
      validate: {
        validator(classes: number[]) {
          return (
            classes.length > 0 &&
            classes.every(
              (c) =>
                Number.isInteger(c) && c >= CLASS_MIN && c <= CLASS_MAX
            )
          );
        },
        message: `Each class must be an integer between ${CLASS_MIN} and ${CLASS_MAX}`,
      },
    },
    dealValue: {
      type: Number,
      required: [true, "Deal value is required"],
      min: [0, "Deal value cannot be negative"],
    },
    status: {
      type: String,
      enum: {
        values: ["new", "in_progress", "negotiating", "converted", "lost"],
        message: "{VALUE} is not a valid status",
      },
      default: "new",
    },
    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: [true, "Partner is required"],
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

leadSchema.index({ partner: 1, status: 1 });
leadSchema.index({ partner: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });

export const Lead = mongoose.model<ILeadDocument, ILeadModel>("Lead", leadSchema);
