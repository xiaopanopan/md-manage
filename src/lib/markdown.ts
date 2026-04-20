import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { defaultSchema } from 'rehype-sanitize';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

// 允许 file:// 协议图片和 class 属性（代码高亮需要）
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [['src', /^(https?:|file:)/, /^\//], 'alt', 'title'],
    code: [['className']],
    span: [['className']],
  },
};

/** 对文件路径做 URL 编码，保留分隔符 `/` */
function encodeFilePath(p: string): string {
  return p
    .replace(/\\/g, '/') // Windows 反斜杠转正斜杠
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/** 自定义 rehype 插件：将相对图片路径转为 file:// 协议（URL 编码以支持空格/中文/特殊字符） */
function rehypeFixImagePaths(workspace: string) {
  return (tree: AnyNode) => {
    visit(tree, 'element', (node: AnyNode) => {
      if (node.tagName === 'img' && node.properties?.src) {
        const src = node.properties.src as string;
        if (!src.startsWith('http') && !src.startsWith('file://') && !src.startsWith('data:')) {
          const encodedWs = encodeFilePath(workspace);
          const encodedSrc = encodeFilePath(src);
          node.properties.src = `file://${encodedWs}/${encodedSrc}`;
        }
      }
    });
  };
}

/** 渲染 Markdown 为 HTML */
export async function renderMarkdown(
  content: string,
  workspace?: string
): Promise<string> {
  let builder = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true });

  if (workspace) {
    builder = builder.use(rehypeFixImagePaths, workspace);
  }

  const result = await builder
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(content);

  return String(result);
}

/** 注入阅读模式样式到 HTML（用于导出） */
export function wrapHtmlForExport(bodyHtml: string, title?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title ?? '简记 Export'}</title>
  <style>${EXPORT_STYLES}</style>
</head>
<body>
  <article class="dz-reader">${bodyHtml}</article>
</body>
</html>`;
}

const EXPORT_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; color: #333; line-height: 1.8; max-width: 720px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; }
  h2 { font-size: 1.5em; font-weight: 600; margin: 0.8em 0 0.4em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h3 { font-size: 1.2em; font-weight: 600; margin: 0.6em 0 0.3em; }
  p { margin: 0.6em 0; }
  a { color: #0066cc; text-decoration: none; }
  img { max-width: 100%; border-radius: 4px; }
  pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow-x: auto; font-size: 0.85em; }
  code { font-family: 'JetBrains Mono', 'Fira Code', Menlo, monospace; font-size: 0.9em; }
  :not(pre) > code { background: rgba(0,0,0,0.04); padding: 2px 5px; border-radius: 3px; }
  blockquote { border-left: 3px solid #ddd; margin: 0; padding: 0.5em 1em; color: #666; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0.3em 0; }
  input[type="checkbox"] { margin-right: 6px; }
  del { color: #999; }
`;
