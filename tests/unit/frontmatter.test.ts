import { describe, it, expect } from 'vitest';
import { parseFrontMatter, stringifyFrontMatter } from '../../src/lib/frontmatter';

describe('parseFrontMatter', () => {
  it('parses YAML front matter', () => {
    const content = '---\ntitle: Hello\ntags:\n  - foo\n  - bar\n---\nBody here';
    const { data, body } = parseFrontMatter(content);
    expect(data.title).toBe('Hello');
    expect(data.tags).toEqual(['foo', 'bar']);
    expect(body.trim()).toBe('Body here');
  });

  it('returns empty data for content without front matter', () => {
    const { data, body } = parseFrontMatter('Just plain text');
    expect(Object.keys(data).length).toBe(0);
    expect(body).toBe('Just plain text');
  });

  it('handles empty content', () => {
    const { data, body } = parseFrontMatter('');
    expect(Object.keys(data).length).toBe(0);
    expect(body).toBe('');
  });
});

describe('stringifyFrontMatter', () => {
  it('produces valid YAML front matter', () => {
    const result = stringifyFrontMatter({ title: 'Test', tags: ['a', 'b'] }, 'Body');
    expect(result).toContain('---');
    expect(result).toContain('title: Test');
    expect(result).toContain('Body');
  });

  it('returns body only when data is empty', () => {
    expect(stringifyFrontMatter({}, 'Just body')).toBe('Just body');
  });

  it('filters out empty values', () => {
    const result = stringifyFrontMatter({ title: '', tags: [] }, 'Body');
    expect(result).toBe('Body');
  });
});
