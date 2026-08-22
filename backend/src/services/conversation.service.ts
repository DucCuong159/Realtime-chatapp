import { emitNewConversationToParticipants } from "../lib/socket.js";
import ConversationModel, {
  ConversationDocument,
} from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import UserModel from "../models/User.js";
import { BadRequestException, NotFoundException } from "../utils/app-error.js";
import { CreateConversationSchemaType } from "../validators/conversation.validator.js";

const validateGroupParticipants = async (
  userId: string,
  participants: string[],
) => {
  // Reject if participant list contains the creator's own userId
  if (participants.includes(userId)) {
    throw new BadRequestException(
      "Participants list should not include yourself",
    );
  }

  // Reject duplicate participant IDs
  const uniqueParticipants = new Set(participants);
  if (uniqueParticipants.size !== participants.length) {
    throw new BadRequestException("Participants list contains duplicate IDs");
  }

  // Verify all participants exist in the database
  const existingUsersCount = await UserModel.countDocuments({
    _id: { $in: participants },
  });
  if (existingUsersCount !== participants.length) {
    throw new NotFoundException("One or more participants not found");
  }
};

const populateAndEmitNewConversation = async (
  conversation: ConversationDocument,
) => {
  const populatedConversation = await conversation.populate(
    "participants",
    "name avatar isAI",
  );
  const participantIdStrings = populatedConversation.participants.map((p) =>
    p._id.toString(),
  );
  emitNewConversationToParticipants(
    participantIdStrings,
    populatedConversation,
  );
  return populatedConversation;
};

const createGroupConversation = async (
  userId: string,
  participants: string[],
  groupName: string,
) => {
  await validateGroupParticipants(userId, participants);

  const allParticipantIds = [userId, ...participants];
  const conversation = await ConversationModel.create({
    participants: allParticipantIds,
    isGroup: true,
    groupName,
    createdBy: userId,
  });

  return populateAndEmitNewConversation(conversation);
};

const findDirectConversation = async (directKey: string) => {
  return ConversationModel.findOne({ directKey })
    .populate("participants", "name avatar isAI")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name avatar isAI",
      },
    });
};

const createSingleConversation = async (
  userId: string,
  participantId: string,
) => {
  if (participantId === userId) {
    throw new BadRequestException("Cannot create a conversation with yourself");
  }

  const otherUser = await UserModel.findById(participantId);
  if (!otherUser) {
    throw new NotFoundException("User not found");
  }

  // Deterministic unique key for 1-1 conversation (order independent)
  const directKey =
    userId < participantId
      ? `${userId}_${participantId}`
      : `${participantId}_${userId}`;
  const allParticipantIds = [participantId, userId];

  const existingConversation = await findDirectConversation(directKey);
  if (existingConversation) return existingConversation;

  try {
    const conversation = await ConversationModel.create({
      participants: allParticipantIds,
      isGroup: false,
      directKey,
      createdBy: userId,
    });

    return populateAndEmitNewConversation(conversation);
  } catch (error: any) {
    // Handle race condition: duplicate key error (code 11000)
    if (error?.code === 11000) {
      const existing = await findDirectConversation(directKey);
      if (existing) return existing;
    }
    throw error;
  }
};

export const createConversationService = async (
  userId: string,
  body: CreateConversationSchemaType,
) => {
  const { participantId, isGroup, participants, groupName } = body;

  if (isGroup && participants?.length && groupName) {
    return createGroupConversation(userId, participants, groupName);
  }

  if (participantId) {
    return createSingleConversation(userId, participantId);
  }

  throw new BadRequestException(
    "Participant ID or group parameters are required",
  );
};

export const getUserConversationsService = async (userId: string) => {
  const conversations = await ConversationModel.find({
    participants: {
      $in: [userId],
    },
  })
    .populate("participants", "name avatar isAI")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name avatar isAI",
      },
    })
    .sort({ updatedAt: -1 });

  return conversations;
};

export const validateConversationParticipantsService = async (
  conversationId: string,
  userId: string,
) => {
  const conversation = await ConversationModel.findOne({
    _id: conversationId,
    participants: {
      $in: [userId],
    },
  }).populate("participants", "name avatar isAI");

  if (!conversation) {
    throw new NotFoundException("Conversation not found or unauthorized");
  }

  return conversation;
};

export const getSingleConversationService = async (
  conversationId: string,
  userId: string,
) => {
  const conversation = await validateConversationParticipantsService(
    conversationId,
    userId,
  );

  const messages = await MessageModel.find({ conversationId })
    .populate("sender", "name avatar isAI")
    .populate({
      path: "replyTo",
      select: "_id content image sender",
      populate: {
        path: "sender",
        select: "name avatar isAI",
      },
    })
    .sort({ createdAt: -1 });

  return {
    conversation,
    messages: messages.reverse(),
  };
};
