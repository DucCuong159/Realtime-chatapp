import { getEnv } from "../utils/get-env.js";

function validateJwtSecret(secret: string): void {
  const minLength = 32;
  const weakSecrets = [
    "your_jwt_secret",
    "secret",
    "changeme",
    "secret_jwt",
    "jwt_secret",
    "yoursecret",
  ];

  if (secret.length < minLength) {
    throw new Error(
      `JWT_SECRET must be at least ${minLength} characters long`,
    );
  }

  if (weakSecrets.includes(secret.toLowerCase())) {
    throw new Error(
      "JWT_SECRET cannot be a common placeholder value. Please use a strong, randomly generated secret.",
    );
  }
}

const jwtSecret = getEnv("JWT_SECRET");
validateJwtSecret(jwtSecret);

export const Env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "8080"),
  MONGO_URI: getEnv("MONGO_URI"),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
};
