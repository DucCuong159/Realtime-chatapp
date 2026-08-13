import UserModel from "../models/User.js";

export const findByIdUserService = async (userId: string) => {
  return await UserModel.findById(userId);
};
