---
name: jwt-auth-security
description: "Production-ready authentication, JWT token lifecycle, and session security patterns. Covers Access/Refresh token rotation, HttpOnly SameSite secure cookie management, Passport JWT strategies, bcrypt hashing, rate-limiting on sensitive endpoints, and CSRF protection."
risk: safe
source: "AAS Specialist"
date_added: "2026-08-25"
---

# JWT & Authentication Security Specialist Skill

Production-grade guide for implementing robust authentication, token lifecycles, and credential protection in Node.js, Express, TypeScript, and modern SPA frontends (React).

---

## 🎯 When to Use
Use this skill when:
- Designing login, registration, password reset, and session workflows.
- Implementing Access Token & Refresh Token rotation with HttpOnly cookies.
- Securing Express API routes with Passport JWT or custom authentication middlewares.
- Protecting against XSS-based token theft, CSRF attacks, and brute-force credential stuffing.
- Managing user logout and token revocation/blacklisting.

---

## 🛡️ 1. Token Strategy: Short-Lived Access + Rotating Refresh Token

### Architecture Overview
1. **Access Token (JWT)**:
   - Lifespan: Short (e.g., 15 minutes).
   - Storage: In-memory (frontend state/Zustand) or `HttpOnly` cookie.
   - Purpose: Stateless authentication on every API request.
2. **Refresh Token**:
   - Lifespan: Longer (e.g., 7 - 30 days).
   - Storage: Secure `HttpOnly`, `SameSite=Lax` (or `Strict`), `Secure` (HTTPS) cookie.
   - Purpose: Request a new Access Token without user re-entering credentials.

### Secure Cookie Configuration
```typescript
import { CookieOptions, Response } from "express";

export const getSecureCookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true, // Prevents JavaScript access (Immune to XSS token theft)
  secure: process.env.NODE_ENV === "production", // Transmitted only over HTTPS
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Protects against CSRF
  maxAge: maxAgeMs,
  path: "/",
});

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("access_token", accessToken, getSecureCookieOptions(15 * 60 * 1000)); // 15 mins
  res.cookie("refresh_token", refreshToken, getSecureCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
};
```

---

## 🔑 2. Passport JWT & Express Middleware

### Passport JWT Strategy (Cookie Extractor)
```typescript
import passport from "passport";
import { Strategy as JwtStrategy, StrategyOptions } from "passport-jwt";
import { Request } from "express";
import { User } from "@/models/User";

const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["access_token"];
  }
  // Fallback to Authorization Header if cookie not present
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  return token;
};

const options: StrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_ACCESS_SECRET!,
};

passport.use(
  new JwtStrategy(options, async (payload, done) => {
    try {
      const user = await User.findById(payload.userId).select("-password").lean();
      if (!user) return done(null, false);
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

export const requireAuth = passport.authenticate("jwt", { session: false });
```

---

## 🔒 3. Password Hashing & Sensitive Field Protection

### Safe Bcrypt Pattern
```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
```

### Prevent Accidental Password Leak in Mongoose
```typescript
userSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});
```

---

## 🛑 4. Rate Limiting on Auth Endpoints

Protect against brute-force password guessing and SMS/OTP spam:

```typescript
import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 failed/successful attempts per IP per window
  message: {
    status: "error",
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## ✅ Security Verification Checklist
- [ ] **No Secret in Git**: Ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are separate, high-entropy (32+ bytes) strings in `.env`.
- [ ] **HttpOnly Cookies**: Never store refresh tokens in `localStorage` or `sessionStorage` in the browser.
- [ ] **Token Expiration**: Always specify `expiresIn` when signing JWTs (`jwt.sign(payload, secret, { expiresIn: '15m' })`).
- [ ] **Input Sanitization**: Validate email, password strength, and usernames with Zod before processing authentication queries.
