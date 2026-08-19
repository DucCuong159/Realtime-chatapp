export type RegisterType = {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  about?: string;
};

export type LoginType = {
  email: string;
  password: string;
};

export type UserType = {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  about?: string | null;
  isAI?: boolean;
  createdAt: string;
  updatedAt: string;
};
