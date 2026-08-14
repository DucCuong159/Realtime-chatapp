import mongoose, { Document, Schema, Types } from "mongoose";

export interface ConversationDocument extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId | null;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  directKey?: string | null;
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
      default: null,
    },
    unreadCount: { type: Number, default: 0 },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String },
    directKey: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

conversationSchema.index(
  { directKey: 1 },
  {
    unique: true,
    partialFilterExpression: { directKey: { $type: "string" } },
  },
);

const ConversationModel = mongoose.model<ConversationDocument>(
  "Conversation",
  conversationSchema,
);

export default ConversationModel;
