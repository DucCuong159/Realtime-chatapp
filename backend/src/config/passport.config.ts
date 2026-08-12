import { Request } from "express";
import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import { findByIdUserService } from "../services/user.service.js";
import { UnauthorizedException } from "../utils/app-error.js";
import { Env } from "./env.config.js";

export const ConfigureStrategy = () => {
  passport.use(
    new JWTStrategy(
      {
        jwtFromRequest: ExtractJwt.fromExtractors([
          (req: Request) => {
            const token = req.cookies.accessToken;
            if (!token) {
              throw new UnauthorizedException("Unauthorized access");
            }
            return token;
          },
        ]),
        secretOrKey: Env.JWT_SECRET,
        audience: ["user"],
        algorithms: ["HS256"],
      },
      async (payload, done) => {
        try {
          const user = await findByIdUserService(payload.userId);

          if (user) return done(null, user);
          return done(null, false);
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );
};

export const passportAuthenticateJwt = passport.authenticate("jwt", {
  session: false,
});

ConfigureStrategy();
