export function replaceTemplateToken(
  template: string,
  token: string,
  value: string,
) {
  return template.replaceAll(token, () => value);
}

export function applyTemplateTokens(
  template: string,
  tokens: Record<string, string>,
) {
  let result = template;
  for (const [token, value] of Object.entries(tokens)) {
    result = replaceTemplateToken(result, token, value);
  }
  return result;
}
