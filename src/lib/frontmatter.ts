import matter from 'gray-matter';

export interface FrontMatterData {
  title?: string;
  created?: string;
  modified?: string;
  tags?: string[];
  [key: string]: unknown;
}

export function parseFrontMatter(content: string): {
  data: FrontMatterData;
  body: string;
} {
  try {
    const { data, content: body } = matter(content);
    return { data: data as FrontMatterData, body };
  } catch {
    return { data: {}, body: content };
  }
}

export function stringifyFrontMatter(
  data: FrontMatterData,
  body: string
): string {
  // 过滤空值
  const cleaned: FrontMatterData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    cleaned[k] = v;
  }
  if (Object.keys(cleaned).length === 0) return body;
  return matter.stringify(body, cleaned);
}
