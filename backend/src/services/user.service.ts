import cloudinary from "../config/cloudinary.config.js";
import UserModel from "../models/User.js";
import { NotFoundException } from "../utils/app-error.js";
import { UpdateProfileSchemaType } from "../validators/user.validator.js";

export const findByIdUserService = async (userId: string) => {
  return await UserModel.findById(userId).select("-password");
};

export const updateProfileService = async (
  userId: string,
  data: UpdateProfileSchemaType,
) => {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.about !== undefined) updateData.about = data.about;
  if (data.avatar !== undefined) {
    if (data.avatar && data.avatar.toLowerCase().startsWith("data:image/")) {
      const uploadRes = await cloudinary.uploader.upload(data.avatar, {
        folder: "avatars",
      });
      updateData.avatar = uploadRes.secure_url;
    } else {
      updateData.avatar = data.avatar;
    }
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true },
  ).select("-password");

  if (!user) {
    throw new NotFoundException("User not found");
  }

  return user;
};

export const getUsersService = async (userId: string) => {
  const users = await UserModel.find({ _id: { $ne: userId } }).select(
    "-password",
  );
  return users;
};
