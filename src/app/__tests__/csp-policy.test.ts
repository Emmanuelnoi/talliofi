import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readIndexHtml(): string {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  return readFileSync(indexPath, 'utf-8');
}

function extractCsp(indexHtml: string): string {
  const match = indexHtml.match(
    /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=(["'])([\s\S]*?)\1[^>]*>/i,
  );
  if (!match?.[2]) {
    throw new Error('Content-Security-Policy meta tag not found in index.html');
  }
  return match[2];
}

describe('content security policy', () => {
  it('does not allow inline or eval script execution', () => {
    const csp = extractCsp(readIndexHtml());

    expect(csp).toMatch(/script-src 'self'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it('uses only external script tags in index.html', () => {
    const indexHtml = readIndexHtml();
    const inlineScriptTags = indexHtml.match(/<script(?![^>]*\bsrc=)[^>]*>/gi);

    expect(inlineScriptTags ?? []).toHaveLength(0);
  });
});
