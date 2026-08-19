import "dotenv/config";
import connectDatabase from "../config/database.config.js";
import UserModel from "../models/User.js";

export const CreateGeminiAI = async () => {
  let existingAI = await UserModel.findOne({ isAI: true });
  if (existingAI) {
    console.log("Old Gemini AI has been deleted", existingAI);
    await UserModel.deleteOne({ _id: existingAI._id });
  }
  const geminiAI = await UserModel.create({
    name: "Gemini AI",
    isAI: true,
    avatar:
      "https://res.cloudinary.com/tuvb6why/image/upload/v1787122231/kc3gh3cfazxt7yk6bshi.png",
    about: "This is AI Assistant",
  });
  console.log("Gemini AI created:", geminiAI);
  return geminiAI;
};

const seedGeminiAI = async () => {
  try {
    await connectDatabase();
    await CreateGeminiAI();
    console.log("Seeding completed");
    process.exit(0);
  } catch (error) {
    console.log("Seeding failed:", error);
    process.exit(1);
  }
};

seedGeminiAI();
