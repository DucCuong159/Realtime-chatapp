import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { UserDocument } from "./User.js";

export interface ConversationDocument extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId | null;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  directKey?: string | null;
  isAiConversation: boolean;
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
    isAiConversation: {
      type: Boolean,
      default: false,
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

conversationSchema.pre("save", async function () {
  if (this.isNew && !this.isGroup) {
    const User = mongoose.model("User") as Model<UserDocument>;
    const participants = await User.find({
      _id: { $in: this.participants },
      isAI: true,
    });

    if (participants.length > 0) {
      this.isAiConversation = true;
    }
  }
});

const ConversationModel = mongoose.model<ConversationDocument>(
  "Conversation",
  conversationSchema,
);

export default ConversationModel;
