import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../config";

export const authPlugin = new Elysia({ name: "auth-plugin" }).use(
  jwt({
    name: "jwt",
    secret: config.jwtSecret,
  }),
);

async function verifyBearerToken({
  jwt,
  headers,
  set,
}: {
  jwt: { verify: (token: string) => Promise<unknown> };
  headers: Record<string, string | undefined>;
  set: { status?: number | string };
}) {
  const auth = headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    set.status = 401;
    return { error: "Unauthorized" };
  }

  const payload = await jwt.verify(auth.slice(7));
  if (!payload) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
}

/** Applies JWT auth to sibling routes in the parent Elysia instance (not site-wide). */
export const requireAuth = new Elysia({ name: "require-auth" })
  .use(authPlugin)
  .onBeforeHandle(verifyBearerToken)
  .as("scoped");
