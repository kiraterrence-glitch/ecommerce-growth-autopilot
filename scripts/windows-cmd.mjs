export function quoteWindowsArg(value) {
  const text = String(value);
  // Keep ordinary CLI tokens unquoted. This matters for n8n 2.39.x on
  // Windows, where a literal quoted token such as "--version" can be
  // interpreted as a command name instead of an option.
  if (/^[A-Za-z0-9_./:=\\-]+$/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildWindowsCommand(command, args = []) {
  return [quoteWindowsArg(command), ...args.map(quoteWindowsArg)].join(" ");
}
