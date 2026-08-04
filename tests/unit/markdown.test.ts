import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/lib/markdown';

describe('renderMarkdown image paths', () => {
  it('resolves a relative image from the current Markdown directory', async () => {
    const html = await renderMarkdown(
      '![chart](chart.png)',
      '/workspace',
      '/workspace/reports/README.md'
    );

    expect(html).toContain(
      'src="md-manage-resource://localhost/%2Fworkspace%2Freports%2Fchart.png"'
    );
  });

  it('keeps app-managed images relative to the workspace root', async () => {
    const html = await renderMarkdown(
      '![](.md-manage/images/pasted.png)',
      '/workspace',
      '/workspace/reports/README.md'
    );

    expect(html).toContain(
      'src="md-manage-resource://localhost/%2Fworkspace%2F.md-manage%2Fimages%2Fpasted.png"'
    );
  });

  it('does not resolve a relative image outside the workspace', async () => {
    const html = await renderMarkdown(
      '![](../../private.png)',
      '/workspace',
      '/workspace/reports/README.md'
    );

    expect(html).not.toContain('md-manage-resource://');
  });
});
