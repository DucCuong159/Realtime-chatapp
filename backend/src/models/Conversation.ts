import mongoose, { Document, Schema, Types } from "mongoose";

export interface ConversationDocument extends Document {
  participants: Types.ObjectId[];
  lastMessage: Types.ObjectId;
  unreadCount: number;
  isGroup: boolean;
  groupName: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        require: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCount: { type: Number, default: 0 },
    isGroup: { type: Boolean, default: false },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const ConversationModel = mongoose.model<ConversationDocument>(
  "Conversation",
  conversationSchema,
);

export default ConversationModel;
