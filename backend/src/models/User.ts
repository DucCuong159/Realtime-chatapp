import mongoose, { Document, Schema } from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt.js";

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string | null;

  about?: string;
  lastSeen?: Date;
  isOnline: boolean;
  agreed?: boolean;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(value: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    avatar: { type: String, default: null },

    about: { type: String },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },
    agreed: { type: Boolean },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret) {
          delete (ret as any).password;
        }
        return ret;
      },
    },
  },
);

userSchema.pre("save", async function () {
  if (this.password && this.isModified("password")) {
    this.password = await hashValue(this.password, 10);
  }
});

userSchema.methods.comparePassword = async function (password: string) {
  return await compareValue(password, this.password);
};

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
