import UserModel from "../models/User.js";
import { UnauthorizedException } from "../utils/app-error.js";
import { compareValue } from "../utils/bcrypt.js";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator.js";

const DUMMY_PASSWORD_HASH =
  "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW";

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

  const isPasswordValid = await compareValue(
    password,
    user?.password || DUMMY_PASSWORD_HASH
  );

  if (!user || !isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  return user;
};
