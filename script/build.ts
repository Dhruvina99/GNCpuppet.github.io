import { build } from "vite";
import { build as esbuild } from "esbuild";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";

async function buildAll() {
  console.log("Building client...");
  await build({
    ...viteConfig,
    configFile: false,
  });

  console.log("\nBuilding server...");
  const serverOutDir = path.resolve(import.meta.dirname, "..", "dist");
  
  if (!fs.existsSync(serverOutDir)) {
    fs.mkdirSync(serverOutDir, { recursive: true });
  }

  await esbuild({
    entryPoints: [path.resolve(import.meta.dirname, "..", "server", "index.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.resolve(serverOutDir, "index.cjs"),
    external: [
      "express",
      "express-session",
      "express-fileupload",
      "passport",
      "passport-local",
      "@neondatabase/serverless",
      "drizzle-orm",
      "ws",
      "canvas",
      "pdfkit",
      "xlsx",
    ],
    minify: false,
    sourcemap: true,
  });

  console.log("\nBuild completed!");
}

buildAll().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
