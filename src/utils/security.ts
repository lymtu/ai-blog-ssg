export function warnInsecureDefaults() {
  const warnings: string[] = [];

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "change-me-in-production"
  ) {
    warnings.push("JWT_SECRET 仍使用默认值，生产环境请务必修改");
  }

  if (
    !process.env.ADMIN_PASSWORD_HASH &&
    (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "changeme")
  ) {
    warnings.push("ADMIN_PASSWORD 仍使用默认值 changeme，生产环境请务必修改");
  }

  for (const message of warnings) {
    console.warn(`[security] ${message}`);
  }
}
