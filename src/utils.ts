import Handlebars from 'handlebars';
import { AbstractInputSuggest, App, stringifyYaml, TFolder } from 'obsidian';

Handlebars.registerHelper('wikilink', function (value: string) {
  if (!value || value.trim() === '') return '';
  return `[[${value}]]`;
});

Handlebars.registerHelper('wikilinks', function (value: string) {
  if (!value || value.trim() === '') return '';
  const delimiters = [';', '|', ','];
  for (const delim of delimiters) {
    if (value.includes(delim) && !value.includes('http')) {
      const items = value
        .split(delim)
        .map((v) => v.trim())
        .filter(Boolean);
      return items.map((item) => `[[${item}]]`).join(', ');
    }
  }
  return `[[${value}]]`;
});

export function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

export function getYearSuffix(row: Record<string, string>): string {
  const releaseDate =
    row['release date'] || row['Release Date'] || row['Release date'] || '';
  let year = '';
  const m = /^\d{4}/.exec(releaseDate);
  if (m) year = m[0];
  if (!year) year = (row['Year'] || row['year'] || '').toString();
  return year ? ` (${year})` : '';
}

export function generateNoteContent(
  row: Record<string, string>,
  arrayDelimiter: string,
  template: string
): string {
  const frontmatter = createFrontmatter(row, arrayDelimiter);

  let body: string;
  if (template) {
    const normalizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      normalizedRow[normalizedKey] = value;
    }

    const compiledTemplate = Handlebars.compile(template, { noEscape: true });
    body = compiledTemplate(normalizedRow);
  } else {
    body = '';
  }

  return `${frontmatter}\n\n${body}`;
}

function createFrontmatter(
  row: Record<string, string>,
  arrayDelimiter: string
): string {
  const properties: Record<string, string | string[]> = {};

  for (const [key, raw] of Object.entries(row)) {
    const value = (raw ?? '').toString();
    if (!value.trim()) continue;
    const cleanKey = key
      .replace(/[^a-zA-Z0-9\s()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    properties[cleanKey] = parseValue(value, arrayDelimiter);
  }

  return `---\n${stringifyYaml(properties)}---`;
}

function parseValue(
  value: string,
  arrayDelimiter: string
): string | string[] {
  if (
    arrayDelimiter &&
    value.includes(arrayDelimiter) &&
    !value.includes('http')
  ) {
    const items = value
      .split(arrayDelimiter)
      .map((v) => v.trim())
      .filter(Boolean);
    return items;
  }
  return value;
}

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  inputEl: HTMLInputElement;

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.inputEl = inputEl;
  }

  getSuggestions(inputStr: string): TFolder[] {
    const folders: TFolder[] = [];
    this.app.vault.getAllLoadedFiles().forEach((file) => {
      if (file instanceof TFolder) {
        folders.push(file);
      }
    });

    const lowerInput = inputStr.toLowerCase();
    return folders.filter((folder) =>
      folder.path.toLowerCase().includes(lowerInput)
    );
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder): void {
    this.inputEl.value = folder.path;
    this.inputEl.trigger('input');
    this.close();
  }
}
