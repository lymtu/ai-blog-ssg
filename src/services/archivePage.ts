import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";
import type { ArticleMeta } from "./ssg";

export async function injectIndexPage(articles: ArticleMeta[]) {
  const indexPath = path.join(config.publicDir, "index.html");

  let html: string;
  try {
    html = await fs.readFile(indexPath, "utf-8");
  } catch {
    return;
  }

  const mdInfoJson = JSON.stringify(articles);

  html = html.replace(
    /<archive-list>[\s\S]*?<\/archive-list>/,
    "<archive-list></archive-list>",
  );

  if (html.includes("<!-- SSG:MD_INFO -->")) {
    html = html.replace("<!-- SSG:MD_INFO -->", mdInfoJson);
  } else if (html.includes('id="site-md-info"')) {
    html = html.replace(
      /<script type="application\/json" id="site-md-info">[\s\S]*?<\/script>/,
      `<script type="application/json" id="site-md-info">${mdInfoJson}</script>`,
    );
  } else {
    html = html.replace(
      "</body>",
      `    <script type="application/json" id="site-md-info">${mdInfoJson}</script>\n  </body>`,
    );
  }

  await fs.writeFile(indexPath, html, "utf-8");
}
