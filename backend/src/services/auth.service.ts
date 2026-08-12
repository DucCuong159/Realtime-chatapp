import UserModel from "../models/User.js";
import {
  NotFoundException,
  UnauthorizedException,
} from "../utils/app-error.js";
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

  if (!user) {
    throw new NotFoundException("User does not exist");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedException("Invalid password");
  }

  return user;
};
