import cloudinary from "../config/cloudinary.config.js";
import MessageModel from "../models/Message.js";
import { NotFoundException } from "../utils/app-error.js";
import { sendMessageSchemaType } from "../validators/message.validator.js";
import { validateConversationParticipantsService } from "./conversation.service.js";

export const sendMessageService = async (
  userId: string,
  body: sendMessageSchemaType,
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

  // websocket implementation

  return { userMessage: newMessage, conversation };
};
