import mongoose, { Document, Schema, Types } from "mongoose";

export interface ConversationDocument extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      required: true,
      validate: [
        (val: Types.ObjectId[]) => val && val.length > 0,
        "Participants array cannot be empty",
      ],
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCount: { type: Number, default: 0 },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String },
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
