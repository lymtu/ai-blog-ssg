import fs from "fs/promises";
import path from "path";

const root = process.cwd();

const pathConversion = async (config = {}) => {
  const {
    outputDir = "dist",
    filesPath = "src/pages",
    removeDir = "src",
  } = config;

  const outputDirAbs = path.join(root, outputDir);

  await fs.cp(path.join(outputDirAbs, filesPath), outputDirAbs, {
    recursive: true,
  });

  const rmDirPath = path.join(outputDirAbs, removeDir);
  await fs.rm(rmDirPath, { recursive: true, force: true });
  console.log(`已删除 ${rmDirPath}。`);
};

export default pathConversion;
