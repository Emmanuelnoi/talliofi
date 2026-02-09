import { describe, it, expect } from 'vitest';
import { highlightText, matchesSearch } from '../highlight-text';

describe('highlightText', () => {
  it('returns original text when query is empty', () => {
    const result = highlightText('Hello World', '');
    expect(result.segments).toEqual(['Hello World']);
    expect(result.hasMatch).toBe(false);
  });

  it('returns original text when query is whitespace only', () => {
    const result = highlightText('Hello World', '   ');
    expect(result.segments).toEqual(['Hello World']);
    expect(result.hasMatch).toBe(false);
  });

  it('highlights matching text at the beginning', () => {
    const result = highlightText('Hello World', 'Hello');
    expect(result.hasMatch).toBe(true);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[1]).toBe(' World');
  });

  it('highlights matching text at the end', () => {
    const result = highlightText('Hello World', 'World');
    expect(result.hasMatch).toBe(true);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toBe('Hello ');
  });

  it('highlights matching text in the middle', () => {
    const result = highlightText('Hello Beautiful World', 'Beautiful');
    expect(result.hasMatch).toBe(true);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toBe('Hello ');
    expect(result.segments[2]).toBe(' World');
  });

  it('performs case-insensitive matching', () => {
    const result = highlightText('Hello World', 'hello');
    expect(result.hasMatch).toBe(true);
    expect(result.segments).toHaveLength(2);
  });

  it('preserves original case in highlighted text', () => {
    const result = highlightText('HELLO World', 'hello');
    expect(result.hasMatch).toBe(true);
    // The second segment (after the mark) should be " World"
    expect(result.segments[1]).toBe(' World');
  });

  it('highlights multiple occurrences', () => {
    const result = highlightText('test one test two test', 'test');
    expect(result.hasMatch).toBe(true);
    // Should have: mark, " one ", mark, " two ", mark
    expect(result.segments).toHaveLength(5);
    expect(result.segments[1]).toBe(' one ');
    expect(result.segments[3]).toBe(' two ');
  });

  it('returns no match when query is not found', () => {
    const result = highlightText('Hello World', 'Goodbye');
    expect(result.hasMatch).toBe(false);
    expect(result.segments).toEqual(['Hello World']);
  });

  it('handles special characters in query', () => {
    const result = highlightText('Price: $100', '$100');
    expect(result.hasMatch).toBe(true);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toBe('Price: ');
  });
});

describe('matchesSearch', () => {
  it('returns true for empty query', () => {
    expect(matchesSearch('', 'anything')).toBe(true);
    expect(matchesSearch('   ', 'anything')).toBe(true);
  });

  it('returns true when query matches any text', () => {
    expect(matchesSearch('test', 'this is a test', 'other')).toBe(true);
    expect(matchesSearch('test', 'no match', 'test here')).toBe(true);
  });

  it('returns false when query matches no text', () => {
    expect(matchesSearch('xyz', 'abc', 'def')).toBe(false);
  });

  it('performs case-insensitive matching', () => {
    expect(matchesSearch('TEST', 'this is a test')).toBe(true);
    expect(matchesSearch('test', 'THIS IS A TEST')).toBe(true);
  });

  it('skips undefined values', () => {
    expect(matchesSearch('test', undefined, 'test')).toBe(true);
    expect(matchesSearch('test', undefined, undefined)).toBe(false);
  });

  it('handles partial matches', () => {
    expect(matchesSearch('gro', 'Groceries')).toBe(true);
    expect(matchesSearch('ies', 'Groceries')).toBe(true);
  });
});
