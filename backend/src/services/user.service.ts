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
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: data },
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
