import "dotenv/config";
import connectDatabase from "../config/database.config.js";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import UserModel from "../models/User.js";

export const CreateGeminiAI = async () => {
  const aiData = {
    name: "Gemini AI",
    isAI: true,
    avatar:
      "https://res.cloudinary.com/tuvb6why/image/upload/v1787122231/kc3gh3cfazxt7yk6bshi.png",
    about: "This is AI Assistant",
  };

  const [primaryAI, ...duplicateAIs] = await UserModel.find({ isAI: true });

  if (primaryAI) {
    primaryAI.name = aiData.name;
    primaryAI.avatar = aiData.avatar;
    primaryAI.about = aiData.about;
    await primaryAI.save();

    if (duplicateAIs.length > 0) {
      const duplicateIds = duplicateAIs.map((u) => u._id);

      // Reassign orphaned messages and conversation participants to primaryAI
      await MessageModel.updateMany(
        { sender: { $in: duplicateIds } },
        { sender: primaryAI._id },
      );
      await ConversationModel.updateMany(
        { participants: { $in: duplicateIds } },
        { $addToSet: { participants: primaryAI._id } },
      );
      await ConversationModel.updateMany(
        { participants: { $in: duplicateIds } },
        { $pull: { participants: { $in: duplicateIds } } },
      );

      await UserModel.deleteMany({ _id: { $in: duplicateIds } });
      console.log(`Cleaned up ${duplicateIds.length} duplicate AI user(s) and reassigned references.`);
    }

    console.log("Gemini AI updated in place:", primaryAI);
    return primaryAI;
  }

  const geminiAI = await UserModel.create(aiData);
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
