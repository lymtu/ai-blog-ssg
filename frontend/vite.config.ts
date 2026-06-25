import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  appType: "mpa",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../public",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        "404": resolve(__dirname, "404.html"),
        header: resolve(__dirname, "src/components/header/index.js"),
        root: resolve(__dirname, "src/root.css"),
        mainCss: resolve(__dirname, "src/main.css"),
        article: resolve(__dirname, "src/assets/style/article.css"),
        subpage: resolve(__dirname, "src/assets/style/subpage.css"),
        archive: resolve(__dirname, "src/assets/style/archive.css"),
        pagination: resolve(__dirname, "src/assets/style/pagination.css"),
        "not-found": resolve(__dirname, "src/assets/style/not-found.css"),
        "article-meta": resolve(__dirname, "src/assets/article-meta.js"),
        "article-code": resolve(__dirname, "src/assets/article-code.js"),
        "article-mermaid": resolve(__dirname, "src/assets/article-mermaid.js"),
        "article-toc": resolve(__dirname, "src/assets/article-toc.js"),
        "article-comments": resolve(__dirname, "src/assets/article-comments.js"),
        "archive-pagination": resolve(__dirname, "src/assets/archive-pagination.js"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
