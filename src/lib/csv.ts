/**
 * Escapes and sanitizes values for safe CSV output.
 *
 * Mitigations:
 * - Prevent spreadsheet formula injection (OWASP CSV Injection)
 * - Strip null bytes / non-printable control chars
 * - Preserve valid CSV quoting semantics
 */
export function escapeCSVValue(value: string | number | boolean): string {
  const raw = String(value);

  // Strip null bytes and non-printable controls except tab/newline/carriage-return.
  const cleaned = Array.from(raw)
    .filter((char) => {
      const code = char.charCodeAt(0);
      if (code === 0) return false;
      if ((code >= 1 && code <= 8) || code === 11 || code === 12) return false;
      if ((code >= 14 && code <= 31) || code === 127) return false;
      return true;
    })
    .join('');

  // If the first non-whitespace character can trigger a spreadsheet formula,
  // prefix with a single quote to force text interpretation.
  const firstNonWhitespace = cleaned.match(/^\s*([^\s])/u)?.[1] ?? '';
  const dangerousStarts = new Set(['=', '+', '-', '@', '|', '\t', '\r']);
  const sanitized = dangerousStarts.has(firstNonWhitespace)
    ? `'${cleaned}`
    : cleaned;

  if (
    sanitized.includes(',') ||
    sanitized.includes('"') ||
    sanitized.includes('\n')
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}
