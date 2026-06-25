import fs from "node:fs/promises";
import path from "node:path";

function isStrictSubdir(rootDir: string, targetDir: string) {
  const root = path.resolve(rootDir);
  const target = path.resolve(targetDir);
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** Remove empty directories from startDir up toward (but not including) rootDir. */
export async function removeEmptyDirsUpward(
  startDir: string,
  rootDir: string,
): Promise<void> {
  const root = path.resolve(rootDir);
  let current = path.resolve(startDir);

  while (isStrictSubdir(root, current)) {
    try {
      const entries = await fs.readdir(current);
      if (entries.length > 0) break;
      await fs.rmdir(current);
      current = path.dirname(current);
    } catch {
      break;
    }
  }
}
