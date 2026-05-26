import { Request, Response } from "express";
import { User, IUserDocument } from "../models/User";
import { Partner } from "../models/Partner";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { signToken } from "../utils/jwt";
import { UserRole } from "../middleware/auth";

function formatUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

async function buildAuthResponse(
  user: IUserDocument
): Promise<{
  token: string;
  user: ReturnType<typeof formatUser>;
  partnerId?: string;
}> {
  const token = signToken({
    id: String(user._id),
    role: user.role,
  });

  const response: {
    token: string;
    user: ReturnType<typeof formatUser>;
    partnerId?: string;
  } = {
    token,
    user: formatUser(user),
  };

  if (user.role === "partner") {
    const partner = await Partner.findOne({ user: user._id }).select("partnerId");
    if (partner) {
      response.partnerId = partner.partnerId;
    }
  }

  return response;
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, city, localArea, pincode, phone } =
    req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  try {
    if (role === "partner") {
      await Partner.create({
        user: user._id,
        city,
        localArea,
        pincode,
        phone,
      });
    }
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }

  const data = await buildAuthResponse(user);
  ApiResponse.success(res, data, "Registration successful", 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const data = await buildAuthResponse(user);
  ApiResponse.success(res, data, "Login successful");
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id);
  if (!user || !user.isActive) {
    throw new ApiError(404, "User not found");
  }

  const data: Record<string, unknown> = {
    user: formatUser(user),
  };

  if (user.role === "partner") {
    const partner = await Partner.findOne({ user: user._id })
      .populate("user", "name email")
      .lean();
    data.partner = partner;
  }

  ApiResponse.success(res, data);
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  ApiResponse.success(res, null, "Password updated successfully");
}
