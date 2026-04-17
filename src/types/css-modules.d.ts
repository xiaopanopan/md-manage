declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module 'gray-matter' {
  interface GrayMatterFile {
    data: Record<string, unknown>;
    content: string;
  }
  function matter(input: string): GrayMatterFile;
  namespace matter {
    function stringify(content: string, data: Record<string, unknown>): string;
  }
  export = matter;
}

declare module 'unified' {
  export function unified(): any;
}
declare module 'remark-parse' {
  const plugin: any;
  export default plugin;
}
declare module 'remark-gfm' {
  const plugin: any;
  export default plugin;
}
declare module 'remark-rehype' {
  const plugin: any;
  export default plugin;
}
declare module 'rehype-highlight' {
  const plugin: any;
  export default plugin;
}
declare module 'rehype-sanitize' {
  export const defaultSchema: any;
  const plugin: any;
  export default plugin;
}
declare module 'rehype-stringify' {
  const plugin: any;
  export default plugin;
}
declare module 'unist-util-visit' {
  export function visit(tree: any, type: string, visitor: (node: any) => void): void;
}
declare module 'highlight.js/styles/github.css' {}
