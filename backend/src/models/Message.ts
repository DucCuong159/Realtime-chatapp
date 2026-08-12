import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReaction {
  user: Types.ObjectId;
  emoji?: string;
}

export interface MessageDocument extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  content?: string;
  imageOrVideoUrl?: string;
  contentType?: "text" | "image" | "video";
  reactions?: IReaction[];
  messageStatus: string;

  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String },
    imageOrVideoUrl: { type: String },
    contentType: { type: String, enum: ["text", "image", "video"] },
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
    messageStatus: { type: String, default: "send" },
  },
  { timestamps: true },
);

const MessageModel = mongoose.model<MessageDocument>("Message", messageSchema);

export default MessageModel;
