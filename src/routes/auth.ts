import { Elysia, t } from "elysia";
import bcrypt from "bcryptjs";
import { authPlugin } from "../plugins/auth";
import { config } from "../config";
import {
  getRateLimitStatus,
  parseJwtExpiresIn,
  recordRateLimitFailure,
  resetRateLimit,
} from "../utils/rateLimit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  return "127.0.0.1";
}

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(authPlugin)
  .post(
    "/login",
    async ({ body, jwt, set, request }) => {
      const ip = getClientIp(request);
      const limitKey = `login:${ip}`;
      const status = getRateLimitStatus(limitKey, LOGIN_MAX_ATTEMPTS);

      if (!status.allowed) {
        set.status = 429;
        return { error: "登录尝试过于频繁，请稍后再试" };
      }

      const validUser = body.username === config.adminUsername;
      const validPassword = await bcrypt.compare(
        body.password,
        config.adminPasswordHash,
      );

      if (!validUser || !validPassword) {
        recordRateLimitFailure(limitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
        set.status = 401;
        return { error: "用户名或密码错误" };
      }

      resetRateLimit(limitKey);

      const expiresIn = parseJwtExpiresIn(config.jwtExpiresIn);
      const token = await jwt.sign({
        sub: body.username,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      });

      return { token, expiresIn };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  );
