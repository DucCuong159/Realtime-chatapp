import cloudinary from "../config/cloudinary.config.js";
import {
  emitLastMessageToParticipants,
  emitNewMessageToConversationRoom,
  isSocketOwnedByUser,
} from "../lib/socket.js";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import { NotFoundException } from "../utils/app-error.js";
import { sendMessageSchemaType } from "../validators/message.validator.js";
import { validateConversationParticipantsService } from "./conversation.service.js";

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
    { path: "sender", select: "name avatar" },
    {
      path: "replyTo",
      select: "content image sender",
      populate: {
        path: "sender",
        select: "name avatar",
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

  // websocket emit the last message to members (personnal room user)
  const targetConversation = updatedConversation || conversation;
  const participantIds = targetConversation.participants.map((id) =>
    id.toString(),
  );
  emitLastMessageToParticipants(participantIds, conversationId, newMessage);
  return { userMessage: newMessage, conversation: targetConversation };
};
