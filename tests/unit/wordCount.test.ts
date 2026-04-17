import { describe, it, expect } from 'vitest';
import { countWords, readingTime } from '../../src/lib/wordCount';

describe('countWords', () => {
  it('counts English words', () => {
    expect(countWords('Hello world foo bar')).toBe(4);
  });

  it('counts CJK characters individually', () => {
    expect(countWords('你好世界')).toBe(4);
  });

  it('counts mixed CJK and English', () => {
    const result = countWords('Hello 你好 world 世界');
    // 2 english + 4 cjk = 6
    expect(result).toBe(6);
  });

  it('strips front matter', () => {
    const content = '---\ntitle: test\n---\nHello world';
    expect(countWords(content)).toBe(2);
  });

  it('strips code blocks', () => {
    const content = 'Before\n```js\nconst x = 1;\n```\nAfter';
    expect(countWords(content)).toBe(2);
  });

  it('strips inline code', () => {
    expect(countWords('Use `npm install` here')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });
});

describe('readingTime', () => {
  it('returns minimum 1 minute', () => {
    expect(readingTime(0)).toBe(1);
    expect(readingTime(10)).toBe(1);
  });

  it('calculates correctly for 300 words', () => {
    expect(readingTime(300)).toBe(1);
  });

  it('rounds up', () => {
    expect(readingTime(301)).toBe(2);
    expect(readingTime(600)).toBe(2);
    expect(readingTime(601)).toBe(3);
  });
});
