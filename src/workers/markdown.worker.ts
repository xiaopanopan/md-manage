/**
 * Markdown 渲染 Web Worker
 * 大文件（>50KB）在 worker 中异步渲染，避免阻塞主线程
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [['src', /^(https?:|file:)/, /^\//], 'alt', 'title'],
    code: [['className']],
    span: [['className']],
  },
};

async function render(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(content);

  return String(result);
}

self.onmessage = async (e: MessageEvent<{ id: number; content: string }>) => {
  const { id, content } = e.data;
  try {
    const html = await render(content);
    self.postMessage({ id, html, error: null });
  } catch (err) {
    self.postMessage({ id, html: '', error: String(err) });
  }
};
