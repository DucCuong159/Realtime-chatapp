import UserModel from "../models/User.js";
import { UnauthorizedException } from "../utils/app-error.js";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator.js";

export const registerService = async (body: RegisterSchemaType) => {
  const { email } = body;
  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    throw new UnauthorizedException("User already exists");
  }

  const newUser = new UserModel(body);
  await newUser.save();
  return newUser;
};

export const loginService = async (body: LoginSchemaType) => {
  const { email, password } = body;
  const user = await UserModel.findOne({ email });

  const isPasswordValid = user ? await user.comparePassword(password) : false;

  if (!user || !isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  return user;
};
