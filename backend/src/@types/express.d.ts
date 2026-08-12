import { UserDocument } from "../models/User.js";

declare global {
  namespace Express {
    interface User extends UserDocument {
      _id?: any;
    }
  }
}
