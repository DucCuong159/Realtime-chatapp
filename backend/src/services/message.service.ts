import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ModelMessage, streamText } from "ai";
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
import { getImageFileInfo } from "../utils/image.js";
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

  if (targetConversation.isAiConversation) {
    queueAIResponse(conversationId, participantIds).catch((error) => {
      console.error(
        `Failed to generate AI response for conversation ${conversationId}:`,
        error,
      );
    });
  }

  return {
    userMessage: newMessage,
    conversation: targetConversation,
  };
};

const aiConversationQueues = new Map<string, Promise<any>>();

const queueAIResponse = async (
  conversationId: string,
  participantIds: string[],
) => {
  const currentTask =
    aiConversationQueues.get(conversationId) || Promise.resolve();

  const nextTask = currentTask
    .catch(() => {})
    .then(() => getAIResponse(conversationId, participantIds));

  aiConversationQueues.set(conversationId, nextTask);

  try {
    return await nextTask;
  } finally {
    if (aiConversationQueues.get(conversationId) === nextTask) {
      aiConversationQueues.delete(conversationId);
    }
  }
};

const getAIResponse = async (
  conversationId: string,
  participantIds: string[],
) => {
  let geminiAI: any = null;
  try {
    geminiAI = await UserModel.findOne({ isAI: true });
    if (!geminiAI) {
      throw new NotFoundException("AI model not found");
    }

    const conversationHistory = await getConversationHistory(conversationId);
    const formattedMessages: ModelMessage[] = conversationHistory
      .map((message: any) => {
        const role: "assistant" | "user" = message.sender?.isAI
          ? "assistant"
          : "user";
        const parts: any[] = [];

        if (message.image) {
          const { mediaType, ext } = getImageFileInfo(message.image);
          parts.push({
            type: "file",
            data: message.image,
            mediaType,
            fileName: `image.${ext}`,
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
      })
      .filter((msg) => msg.content.length > 0);

    const result = streamText({
      model: google("gemini-3.6-flash"),
      messages: formattedMessages,
      abortSignal: AbortSignal.timeout(60000),
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

    if (!fullResponse.trim()) {
      emitConversationAI({
        conversationId,
        chunk: null,
        sender: geminiAI,
        done: true,
        message: null,
      });
      return null;
    }

    const aiMessage = await MessageModel.create({
      conversationId,
      sender: geminiAI._id,
      content: fullResponse,
    });
    await aiMessage.populate("sender", "name avatar isAI");

    await ConversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: aiMessage._id,
    });

    emitConversationAI({
      conversationId,
      chunk: null,
      sender: geminiAI,
      done: true,
      message: aiMessage,
    });

    emitLastMessageToParticipants(participantIds, conversationId, aiMessage);
    return aiMessage;
  } catch (error) {
    console.error(
      `AI generation error for conversation ${conversationId}:`,
      error,
    );
    emitConversationAI({
      conversationId,
      chunk: null,
      sender: geminiAI || undefined,
      done: true,
      message: null,
      error: "Failed to generate AI response. Please try again later.",
    });
    throw error;
  }
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
