import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReaction {
  user: Types.ObjectId;
  emoji?: string;
}

export interface ICallInfo {
  callType: "audio" | "video";
  status: "completed" | "missed" | "declined" | "busy";
  duration?: number;
}

export interface MessageDocument extends Document {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  receiver?: Types.ObjectId;
  replyTo?: Types.ObjectId | null;
  content?: string;
  image?: string;
  contentType?: "text" | "image" | "video" | "call";
  callInfo?: ICallInfo;
  reactions?: IReaction[];
  messageStatus: string;

  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
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
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    content: { type: String },
    image: { type: String },
    contentType: {
      type: String,
      enum: ["text", "image", "video", "call"],
      default: "text",
    },
    callInfo: {
      type: {
        callType: { type: String, enum: ["audio", "video"] },
        status: {
          type: String,
          enum: ["completed", "missed", "declined", "busy"],
        },
        duration: { type: Number, default: 0 },
      },
      default: undefined,
    },
    reactions: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: { type: String },
      },
    ],
    messageStatus: { type: String, default: "send" },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const MessageModel = mongoose.model<MessageDocument>("Message", messageSchema);

export default MessageModel;
