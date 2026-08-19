import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ModelMessage, streamText } from "ai";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.config.js";
import { Env } from "../config/env.config.js";
import {
  emitConversationAI,
  emitLastMessageToParticipants,
  emitNewMessageToConversationRoom,
  isSocketOwnedByUser,
} from "../lib/socket.js";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import UserModel from "../models/User.js";
import { NotFoundException } from "../utils/app-error.js";
import { sendMessageSchemaType } from "../validators/message.validator.js";
import { validateConversationParticipantsService } from "./conversation.service.js";

const google = createGoogleGenerativeAI({
  apiKey: Env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const sendMessageService = async (
  userId: string,
  body: sendMessageSchemaType,
  originatingSocketId?: string,
) => {
  const { conversationId, content, image, replyTo } = body;

  const conversation = await validateConversationParticipantsService(
    conversationId,
    userId,
  );

  if (replyTo) {
    const replyMessage = await MessageModel.findOne({
      _id: replyTo,
      conversationId: conversationId,
    });

    if (!replyMessage) {
      throw new NotFoundException("Message not found or unauthorized");
    }
  }

  let imageUrl: string | undefined;

  if (image) {
    // upload the image to cloudinary and save the url
    const uploadRes = await cloudinary.uploader.upload(image);
    imageUrl = uploadRes.secure_url;
  }

  const newMessage = await MessageModel.create({
    conversationId,
    sender: userId,
    content,
    image: imageUrl,
    replyTo,
  });

  await newMessage.populate([
    { path: "sender", select: "name avatar isAI" },
    {
      path: "replyTo",
      select: "content image sender",
      populate: {
        path: "sender",
        select: "name avatar isAI",
      },
    },
  ]);

  const updatedConversation = await ConversationModel.findByIdAndUpdate(
    conversationId,
    { lastMessage: newMessage._id },
    { new: true },
  );

  // websocket emit the new message to the conversation room (excluding verified sender socket)
  const verifiedSocketId = isSocketOwnedByUser(userId, originatingSocketId)
    ? originatingSocketId
    : undefined;

  emitNewMessageToConversationRoom(
    conversationId,
    newMessage,
    verifiedSocketId,
  );

  // websocket emit the last message to members (personal room user)
  const targetConversation = updatedConversation || conversation;
  const participantIds = targetConversation.participants.map((id) =>
    id.toString(),
  );
  emitLastMessageToParticipants(participantIds, conversationId, newMessage);

  let aiResponse: any = null;
  if (targetConversation.isAiConversation) {
    aiResponse = await getAIResponse(conversationId, userId);
    if (aiResponse) {
      conversation.lastMessage = aiResponse._id as mongoose.Types.ObjectId;
      await conversation.save();
    }
  }

  return {
    userMessage: newMessage,
    conversation: targetConversation,
    aiResponse,
  };
};

const getAIResponse = async (conversationId: string, userId: string) => {
  const geminiAI = await UserModel.findOne({ isAI: true });
  if (!geminiAI) {
    throw new NotFoundException("AI model not found");
  }

  const conversationHistory = await getConversationHistory(conversationId);
  const formattedMessages: ModelMessage[] = conversationHistory.map(
    (message: any) => {
      const role = message.sender.isAI ? "assistant" : "user";
      const parts: any[] = [];

      if (message.image) {
        parts.push({
          type: "file",
          data: message.image,
          mediaType: "image/png",
          fileName: "image.png",
        });
        if (!message.content) {
          parts.push({
            type: "text",
            text: "Describe what you see in the image",
          });
        }
      }
      if (message.content) {
        parts.push({
          type: "text",
          text: message.replyTo
            ? `[Replying to: "${message.replyTo.content}"]\n${message.content}`
            : message.content,
        });
      }
      return { role, content: parts };
    },
  );
  const result = await streamText({
    model: google("gemini-3.6-flash"),
    messages: formattedMessages,
    system: `
    You are a helpful and friendly AI assistant. 
    Your name is ${geminiAI.name}. 
    Respond only with text and attend to the last user message only.
    `,
  });

  let fullResponse = "";

  for await (const chunk of result.textStream) {
    emitConversationAI({
      conversationId,
      chunk,
      sender: geminiAI,
      done: false,
      message: null,
    });
    fullResponse += chunk;
  }
  if (!fullResponse.trim()) return "";

  const aiMessage = await MessageModel.create({
    conversationId,
    sender: geminiAI._id,
    content: fullResponse,
  });
  await aiMessage.populate("sender", "name avatar isAI");

  emitConversationAI({
    conversationId,
    chunk: null,
    sender: geminiAI,
    done: true,
    message: aiMessage,
  });

  emitLastMessageToParticipants([userId], conversationId, aiMessage);
  return aiMessage;
};

const getConversationHistory = async (conversationId: string) => {
  const messages = await MessageModel.find({ conversationId })
    .populate("sender", "isAI")
    .populate("replyTo", "content")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return messages.reverse();
};
