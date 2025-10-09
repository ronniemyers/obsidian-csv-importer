import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, normalizePath } from 'obsidian';
import Papa from 'papaparse';

interface CSVImporterSettings {
  outputFolder: string;
}

const DEFAULT_SETTINGS: CSVImporterSettings = {
  outputFolder: 'CSV Imports'
}

export default class CSVImporterPlugin extends Plugin {
  settings!: CSVImporterSettings;

  async onload() {
    await this.loadSettings();

    const ribbonIconEl = this.addRibbonIcon('table', 'Import CSV', () => {
      new ImportModal(this.app, this).open();
    });
    ribbonIconEl.addClass('csv-importer-ribbon');

    this.addCommand({
      id: 'import-csv',
      name: 'Import CSV to notes',
      callback: () => {
        new ImportModal(this.app, this).open();
      }
    });

    this.addSettingTab(new CSVImporterSettingTab(this.app, this));
  }

  async ensureFolder(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    const parts = normalized.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  async createNote(filename: string, content: string, folder: string): Promise<void> {
    await this.ensureFolder(folder);
    const fullPath = normalizePath(`${folder}/${filename}`);
    const existing = this.app.vault.getAbstractFileByPath(fullPath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(fullPath, content);
    }
  }

  async saveSettings() { await this.saveData(this.settings); }
  async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
}

class ImportModal extends Modal {
  private plugin: CSVImporterPlugin;
  private fileInput!: HTMLInputElement;
  private droppedFile?: File;
  private titleInput!: HTMLInputElement;
  private folderInput!: HTMLInputElement;

  constructor(app: App, plugin: CSVImporterPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'CSV Importer' });

    // CSV file chooser
    const fileWrap = contentEl.createDiv({ cls: 'csv-importer-field csv-importer-file' });
    const inputId = `csv-file-input-${Date.now()}`;
    this.fileInput = fileWrap.createEl('input', { type: 'file' });
    this.fileInput.id = inputId;
    this.fileInput.addClass('csv-importer-file-input');
    const fileLabel = fileWrap.createEl('label', { text: 'Select CSV', attr: { for: inputId } });
    fileLabel.addClass('csv-importer-file-button');
    const fileNameEl = fileWrap.createEl('span', { text: 'No file chosen' });
    fileNameEl.addClass('csv-importer-file-name');
    this.fileInput.accept = '.csv,text/csv';
    this.fileInput.addEventListener('change', () => {
      const name = this.fileInput.files && this.fileInput.files.length > 0 ? this.fileInput.files[0].name : 'No file chosen';
      fileNameEl.setText(name);
    });
    this.fileInput.accept = '.csv,text/csv';

    const setDrag = (on: boolean) => {
      fileWrap.toggleClass('is-dragover', on);
    };
    fileWrap.addEventListener('dragover', (e) => { e.preventDefault(); setDrag(true); });
    fileWrap.addEventListener('dragleave', () => setDrag(false));
    fileWrap.addEventListener('drop', (e) => {
      e.preventDefault();
      setDrag(false);
      const files = (e as DragEvent).dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file && file.name.toLowerCase().endsWith('.csv')) {
          this.droppedFile = file;
          fileNameEl.setText(file.name);
        }
      }
    });

    // Title column
    const titleWrap = contentEl.createDiv({ cls: 'csv-importer-field' });
    titleWrap.createEl('label', { text: 'Title Column', attr: { for: 'title-col' } });
    this.titleInput = titleWrap.createEl('input', { type: 'text' });
    this.titleInput.addClass('csv-importer-input');
    this.titleInput.placeholder = 'e.g., title or name (unique)';

    // Output folder
    const folderWrap = contentEl.createDiv({ cls: 'csv-importer-field' });
    folderWrap.createEl('label', { text: 'Output Folder', attr: { for: 'out-folder' } });
    this.folderInput = folderWrap.createEl('input', { type: 'text' });
    this.folderInput.addClass('csv-importer-input');
    this.folderInput.value = this.plugin.settings.outputFolder;

    const submit = contentEl.createEl('button', { text: 'Import' });
    submit.addClass('csv-importer-submit');
    submit.onclick = () => this.handleImport();
  }

  async handleImport() {
    try {
      const file = this.droppedFile ?? this.fileInput.files?.[0];
      const titleColumn = this.titleInput.value.trim();
      const outFolder = this.folderInput.value.trim() || this.plugin.settings.outputFolder;
      if (!file) { new Notice('Please choose a CSV file'); return; }
      if (!titleColumn) { new Notice('Please enter a title column'); return; }

      const text = await file.text();
      const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parseResult.errors.length) {
        new Notice(`CSV parse error: ${parseResult.errors[0].message}`);
        return;
      }
      const rows = parseResult.data as Record<string, string>[];
      if (rows.length === 0) { new Notice('No rows found'); return; }
      if (!Object.prototype.hasOwnProperty.call(rows[0], titleColumn)) {
        new Notice(`Title column not found. Available: ${Object.keys(rows[0]).join(', ')}`);
        return;
      }

      let created = 0;
      for (const row of rows) {
        const title = (row[titleColumn] || 'Untitled').toString();
        const filename = `${sanitizeFilename(title)}${getYearSuffix(row)}.md`;
        const content = generateNoteContent(row, titleColumn);
        await this.plugin.createNote(filename, content, outFolder);
        created++;
      }
      new Notice(`Created ${created} notes in ${outFolder}`);
      this.close();
    } catch (e) {
      console.error('CSV import failed:', e);
      new Notice('Failed to import CSV');
    }
  }
}

class CSVImporterSettingTab extends PluginSettingTab {
  plugin: CSVImporterPlugin;
  constructor(app: App, plugin: CSVImporterPlugin) { super(app, plugin); this.plugin = plugin; }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName('CSV Importer Settings').setHeading();
    new Setting(containerEl)
      .setName('Default output folder')
      .addText(t => t
        .setPlaceholder('CSV Imports')
        .setValue(this.plugin.settings.outputFolder)
        .onChange(async (v) => { this.plugin.settings.outputFolder = v; await this.plugin.saveSettings(); }));
  }
}

function sanitizeFilename(title: string): string {
  return title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().substring(0, 100);
}

function getYearSuffix(row: Record<string, string>): string {
  const releaseDate = row['release date'] || row['Release Date'] || row['Release date'] || '';
  let year = '';
  const m = /^\d{4}/.exec(releaseDate);
  if (m) year = m[0];
  if (!year) year = (row['Year'] || row['year'] || '').toString();
  return year ? ` (${year})` : '';
}

function generateNoteContent(row: Record<string, string>, titleColumn: string): string {
  const frontmatter = createFrontmatter(row);
  const title = row[titleColumn] || 'Untitled';
  const body = `# ${title}\n\n## Notes\n`;
  return `${frontmatter}\n\n${body}`;
}

function createFrontmatter(row: Record<string, string>): string {
  const properties: Record<string, any> = {};
  for (const [key, raw] of Object.entries(row)) {
    const value = (raw ?? '').toString();
    if (!value.trim()) continue;
    const cleanKey = key.replace(/[^a-zA-Z0-9\s()]/g, ' ').replace(/\s+/g, ' ').trim();
    properties[cleanKey] = parseValue(value);
  }
  const yaml: string[] = ['---'];
  for (const [k, v] of Object.entries(properties)) {
    if (Array.isArray(v)) {
      yaml.push(`${k}:`);
      v.forEach(it => yaml.push(`  - ${it}`));
    } else if (typeof v === 'string' && v.includes('\n')) {
      yaml.push(`${k}: |`);
      v.split('\n').forEach(line => yaml.push(`  ${line}`));
    } else {
      yaml.push(`${k}: ${escapeYamlValue(v)}`);
    }
  }
  yaml.push('---');
  return yaml.join('\n');
}

function parseValue(value: string): any {
  if (value.includes(',') && !value.includes('http')) {
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const num = parseFloat(value);
  if (!isNaN(num) && isFinite(num)) return num;
  return value;
}

function escapeYamlValue(value: any): string {
  if (typeof value === 'string') {
    if (value.includes('"') || value.includes("'") || value.includes('\n') || value.includes(':')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}
