import UserModel from "../models/User.js";

export const findByIdUserService = async (userId: string) => {
  return await UserModel.findById(userId).select("-password");
};

export const getUsersService = async (userId: string) => {
  const users = await UserModel.find({ _id: { $ne: userId } }).select(
    "-password",
  );
  return users;
};
