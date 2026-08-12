import mongoose from "mongoose";
import { Env } from "./env.config.js";

const connectDatabase = async () => {
  try {
    await mongoose.connect(Env.MONGO_URI);
    console.log("Database connected");
  } catch (error) {
    console.log("Database connection error", error);
    throw error;
  }
};

export default connectDatabase;
