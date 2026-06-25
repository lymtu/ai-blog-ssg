import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { App } from "../app";

const FIXTURE_MD = `---
title: Fixture Post
date: 2026-01-15T08:00:00.000Z
category: test
---

Hello from fixture.
`;

describe("admin api", () => {
  let app: App;
  let tempDir: string;
  let markdownDir: string;
  let publicDir: string;
  let token: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-ssg-test-"));
    markdownDir = path.join(tempDir, "markdown");
    publicDir = path.join(tempDir, "public");

    process.env.BLOG_MARKDOWN_DIR = markdownDir;
    process.env.BLOG_PUBLIC_DIR = publicDir;
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "testpass";
    process.env.JWT_SECRET = "test-jwt-secret";

    await fs.mkdir(path.join(markdownDir, "test"), { recursive: true });
    await fs.writeFile(path.join(markdownDir, "test", "fixture-post.md"), FIXTURE_MD);
    await fs.mkdir(path.join(publicDir, "data"), { recursive: true });
    await fs.writeFile(
      path.join(publicDir, "data", "views.json"),
      JSON.stringify({}),
      "utf-8",
    );

    const { createApp } = await import("../app");
    app = createApp();

    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "testpass" }),
      }),
    );
    const loginData = await loginRes.json();
    token = loginData.token;
  });

  afterEach(async () => {
    delete process.env.BLOG_MARKDOWN_DIR;
    delete process.env.BLOG_PUBLIC_DIR;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function authHeaders(extra: Record<string, string> = {}) {
    return {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...extra,
    };
  }

  it("POST /api/auth/login succeeds with valid credentials", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "testpass" }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeString();
  });

  it("POST /api/auth/login fails with invalid credentials", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "wrong" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/posts returns 401 without auth", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/posts"),
    );
    expect(res.status).toBe(401);
  });

  it("supports post CRUD lifecycle", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/api/admin/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          category: "test",
          slug: "new-post",
          title: "New Post",
          date: "2026-02-01T10:00:00.000Z",
          body: "## Intro\n\nContent here.",
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    expect(createData.ok).toBe(true);

    const getRes = await app.handle(
      new Request("http://localhost/api/admin/posts/test/new-post", {
        headers: authHeaders(),
      }),
    );
    expect(getRes.status).toBe(200);
    const post = await getRes.json();
    expect(post.title).toBe("New Post");

    const updateRes = await app.handle(
      new Request("http://localhost/api/admin/posts/test/new-post", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          category: "test",
          slug: "new-post",
          title: "Updated Post",
          date: "2026-02-01T10:00:00.000Z",
          body: "Updated body.",
        }),
      }),
    );
    expect(updateRes.status).toBe(200);

    const updatedRes = await app.handle(
      new Request("http://localhost/api/admin/posts/test/new-post", {
        headers: authHeaders(),
      }),
    );
    const updated = await updatedRes.json();
    expect(updated.title).toBe("Updated Post");

    const deleteRes = await app.handle(
      new Request("http://localhost/api/admin/posts/test/new-post", {
        method: "DELETE",
        headers: authHeaders(),
      }),
    );
    expect(deleteRes.status).toBe(200);

    const goneRes = await app.handle(
      new Request("http://localhost/api/admin/posts/test/new-post", {
        headers: authHeaders(),
      }),
    );
    expect(goneRes.status).toBe(404);
  });

  it("POST /api/admin/preview returns HTML without article-toc", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/preview", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: "Preview",
          body: "## Heading\n\nParagraph with **bold**.",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.html).toBeString();
    expect(data.tocHtml).toBeUndefined();
    expect(data.html).not.toContain("article-toc");
  });
});
