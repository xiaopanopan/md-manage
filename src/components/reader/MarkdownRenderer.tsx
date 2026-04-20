import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  useCurrentFile,
  useCurrentContent,
  useWorkspace,
} from '@/hooks/useAppStore';
import { parseFrontMatter } from '@/lib/frontmatter';
import { renderMarkdown } from '@/lib/markdown';
import { ImageLightbox } from './ImageLightbox';
import { ExportBar } from './ExportBar';
import { ReaderSearchBar } from './ReaderSearchBar';
import styles from './MarkdownRenderer.module.css';
import '@/styles/reader.css';
import 'highlight.js/styles/github.css';

export function MarkdownRenderer() {
  const currentFile = useCurrentFile();
  const content = useCurrentContent();
  const workspace = useWorkspace();

  const [html, setHtml] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // body 部分（去除 front matter）
  const body = useMemo(() => parseFrontMatter(content).body, [content]);
  const title = useMemo(() => parseFrontMatter(content).data.title, [content]);

  // 渲染 Markdown → HTML
  useEffect(() => {
    let cancelled = false;
    renderMarkdown(body, workspace ?? undefined).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [body, workspace]);

  // Cmd+F 打开查找栏
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 拦截图片点击 → 打开 Lightbox
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) setLightboxSrc(src);
    }
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = (target as HTMLAnchorElement).href;
      if (href && href.startsWith('http')) {
        window.open(href);
      }
    }
  }, []);

  if (!currentFile) {
    return (
      <div className={styles.area}>
        <div className={styles.empty}>选择文件以阅读</div>
      </div>
    );
  }

  return (
    <div className={styles.area}>
      {searchOpen && (
        <ReaderSearchBar
          container={contentRef.current}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <div className={styles.scroll}>
        <div ref={contentRef} className="dz-reader" onClick={handleClick}>
          {title && <h1>{title}</h1>}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      <ExportBar />
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
