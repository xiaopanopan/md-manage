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
