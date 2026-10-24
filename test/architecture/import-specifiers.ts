// Textual reader of import specifiers shared by the architecture tests.

export type Specifier = Readonly<{ specifier: string; typeOnly: boolean }>;

/**
 * Reads import specifiers as text. Comments are removed and every string or template literal becomes a
 * numbered token first, so text inside comments and strings never looks like an import.
 */
export function readSpecifiers(source: string): Specifier[] {
  const literals: string[] = [];
  let code = '';
  for (let index = 0; index < source.length;) {
    const char = source[index]!;
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index++;
    } else if (char === '/' && next === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      code += ' ';
    } else if (char === "'" || char === '"' || char === '`') {
      let end = index + 1;
      while (end < source.length && source[end] !== char) end += source[end] === '\\' ? 2 : 1;
      literals.push(char === '`' ? '<computed>' : source.slice(index + 1, end));
      code += `"#${literals.length - 1}"`;
      index = end + 1;
    } else {
      code += char;
      index++;
    }
  }
  const literal = (token: string) => literals[Number(token)]!;
  const found: Array<Specifier & { at: number }> = [];
  for (const match of code.matchAll(/\b(import|export)\s+(type\s+)?([^";]*?)\bfrom\s*"#(\d+)"/g)) {
    const [, keyword, typeKeyword, clause] = match;
    const named = /^\{([^}]*)\}$/.exec(clause!.trim());
    const elements = named?.[1]!.split(',').map(element => element.trim()).filter(Boolean) ?? [];
    const allTypes = elements.length > 0 && elements.every(element => element.startsWith('type '));
    found.push({ at: match.index, specifier: literal(match[4]!),
      typeOnly: !!typeKeyword || (keyword === 'import' && allTypes) || (keyword === 'export' && allTypes) });
  }
  for (const match of code.matchAll(/\bimport\s*"#(\d+)"/g)) {
    found.push({ at: match.index, specifier: literal(match[1]!), typeOnly: false });
  }
  for (const match of code.matchAll(/\bimport\s*\(\s*(?:"#(\d+)"\s*)?/g)) {
    found.push({ at: match.index, specifier: match[1] === undefined ? '<computed>' : literal(match[1]), typeOnly: false });
  }
  for (const match of code.matchAll(/\brequire(?:\.resolve)?\s*\(\s*(?:"#(\d+)"\s*)?/g)) {
    found.push({ at: match.index, specifier: match[1] === undefined ? '<computed>' : literal(match[1]), typeOnly: false });
  }
  return found.sort((a, b) => a.at - b.at).map(({ specifier, typeOnly }) => ({ specifier, typeOnly }));
}
