import bcrypt from "bcrypt";

export const hashValue = async (value: string, salt: number) => {
  return await bcrypt.hash(value, salt);
};

export const compareValue = async (plainValue: string, hashedValue: string) => {
  return await bcrypt.compare(plainValue, hashedValue);
};
