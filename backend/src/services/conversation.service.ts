import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import UserModel from "../models/User.js";
import { BadRequestException, NotFoundException } from "../utils/app-error.js";
import { CreateConversationSchemaType } from "../validators/conversation.validator.js";

export const createConversationService = async (
  userId: string,
  body: CreateConversationSchemaType,
) => {
  const { participantId, isGroup, participants, groupName } = body;

  let conversation;
  let allParticipantIds: string[] = [];

  if (isGroup && participants?.length && groupName) {
    allParticipantIds = [userId, ...participants];
    conversation = await ConversationModel.create({
      participants: allParticipantIds,
      isGroup: true,
      groupName,
      createdBy: userId,
    });
    conversation = await conversation.populate("participants", "name avatar");
  } else if (participantId) {
    if (participantId === userId) {
      throw new BadRequestException(
        "Cannot create a conversation with yourself",
      );
    }

    const otherUser = await UserModel.findById(participantId);
    if (!otherUser) {
      throw new NotFoundException("User not found");
    }
    allParticipantIds = [participantId, userId];

    const existingConversation = await ConversationModel.findOne({
      participants: {
        $all: allParticipantIds,
        $size: 2,
      },
    }).populate("participants", "name avatar");

    if (existingConversation) return existingConversation;

    conversation = await ConversationModel.create({
      participants: allParticipantIds,
      isGroup: false,
      createdBy: userId,
    });
    conversation = await conversation.populate("participants", "name avatar");
  } else {
    throw new BadRequestException(
      "Participant ID or group parameters are required",
    );
  }

  // Implement websocket

  return conversation;
};

export const getUserConversationsService = async (userId: string) => {
  const conversations = await ConversationModel.find({
    participants: {
      $in: [userId],
    },
  })
    .populate("participants", "name avatar")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name avatar",
      },
    })
    .sort({ updatedAt: -1 });

  return conversations;
};

export const getSingleConversationService = async (
  conversationId: string,
  userId: string,
) => {
  const conversation = await ConversationModel.findOne({
    _id: conversationId,
    participants: {
      $in: [userId],
    },
  });

  if (!conversation) {
    throw new BadRequestException(
      "Conversation not found or you are not authorized to view this conversation",
    );
  }

  const messages = await MessageModel.find({ conversationId })
    .populate("sender", "name avatar")
    .populate({
      path: "replyTo",
      select: "_id content image sender",
      populate: {
        path: "sender",
        select: "name avatar",
      },
    })
    .sort({ createdAt: -1 });

  return {
    conversation,
    messages,
  };
};
