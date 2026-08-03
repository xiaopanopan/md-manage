import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/lib/markdown';

describe('renderMarkdown image paths', () => {
  it('resolves a relative image from the current Markdown directory', async () => {
    const html = await renderMarkdown(
      '![chart](chart.png)',
      '/workspace',
      '/workspace/reports/README.md'
    );

    expect(html).toContain('src="file:///workspace/reports/chart.png"');
  });

  it('keeps app-managed images relative to the workspace root', async () => {
    const html = await renderMarkdown(
      '![](.md-manage/images/pasted.png)',
      '/workspace',
      '/workspace/reports/README.md'
    );

    expect(html).toContain('src="file:///workspace/.md-manage/images/pasted.png"');
  });

  it('does not resolve a relative image outside the workspace', async () => {
    const html = await renderMarkdown(
      '![](../../private.png)',
      '/workspace',
      '/workspace/reports/README.md'
    );

    expect(html).not.toContain('file://');
  });
});
