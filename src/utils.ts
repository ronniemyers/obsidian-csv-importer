import Handlebars from 'handlebars';

export function sanitizeFilename(title: string): string {
  return title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().substring(0, 100);
}

export function getYearSuffix(row: Record<string, string>): string {
  const releaseDate = row['release date'] || row['Release Date'] || row['Release date'] || '';
  let year = '';
  const m = /^\d{4}/.exec(releaseDate);
  if (m) year = m[0];
  if (!year) year = (row['Year'] || row['year'] || '').toString();
  return year ? ` (${year})` : '';
}

export function generateNoteContent(row: Record<string, string>, arrayDelimiter: string, template: string): string {
  const frontmatter = createFrontmatter(row, arrayDelimiter);
  
  let body: string;
  if (template) {
    // Normalize keys for Handlebars (remove spaces and special chars)
    const normalizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      normalizedRow[normalizedKey] = value;
    }
    
    const compiledTemplate = Handlebars.compile(template, { noEscape: true });
    body = compiledTemplate(normalizedRow);
  } else {
    body = '';
  }
  
  return `${frontmatter}\n\n${body}`;
}

function createFrontmatter(row: Record<string, string>, arrayDelimiter: string): string {
  const properties: Record<string, string | string[]> = {};
  for (const [key, raw] of Object.entries(row)) {
    const value = (raw ?? '').toString();
    if (!value.trim()) continue;
    const cleanKey = key.replace(/[^a-zA-Z0-9\s()]/g, ' ').replace(/\s+/g, ' ').trim();
    properties[cleanKey] = parseValue(value, arrayDelimiter);
  }
  const yaml: string[] = ['---'];
  for (const [k, v] of Object.entries(properties)) {
    if (Array.isArray(v)) {
      yaml.push(`${k}:`);
      v.forEach(it => yaml.push(`  - ${it}`));
    } else if (typeof v === 'string' && v.includes('\n')) {
      yaml.push(`${k}: |`);
      v.split('\n').forEach(line => yaml.push(`  ${line}`));
    } else if (typeof v === 'string' && /^0\d+$/.test(v)) {
      yaml.push(`${k}: "${v}"`);
    } else {
      yaml.push(`${k}: ${escapeYamlValue(v)}`);
    }
  }
  yaml.push('---');
  return yaml.join('\n');
}

function parseValue(value: string, arrayDelimiter: string): string | string[] {
  if (arrayDelimiter && value.includes(arrayDelimiter) && !value.includes('http')) {
    return value.split(arrayDelimiter).map(v => v.trim()).filter(Boolean);
  }
  return value;
}

function escapeYamlValue(value: string | string[]): string {
  if (typeof value === 'string') {
    if (value.includes('"') || value.includes("'") || value.includes('\n') || value.includes(':')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}
