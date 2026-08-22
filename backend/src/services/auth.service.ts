import crypto from "node:crypto";
import UserModel from "../models/User.js";
import { UnauthorizedException } from "../utils/app-error.js";
import { compareValue, hashValue } from "../utils/bcrypt.js";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator.js";

// Generated dynamically at startup to mitigate timing attacks / user enumeration
// without storing hardcoded hash strings in source code (resolves SonarCloud S2068 warning).
const DUMMY_HASH = await hashValue(crypto.randomUUID(), 10);

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
    user?.password || DUMMY_HASH,
  );

  if (!user || !isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  return user;
};
