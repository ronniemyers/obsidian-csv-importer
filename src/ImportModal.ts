import { App, Modal, Notice } from 'obsidian';
import Papa from 'papaparse';
import Handlebars from 'handlebars';
import type CSVImporterPlugin from './main';
import {
  sanitizeFilename,
  getYearSuffix,
  generateNoteContent,
  FolderSuggest,
} from './utils';

class PreviewModal extends Modal {
  private filename: string;
  private content: string;

  constructor(app: App, filename: string, content: string) {
    super(app);
    this.filename = filename;
    this.content = content;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Preview' });
    
    const filenameEl = contentEl.createEl('p');
    filenameEl.createEl('strong', { text: 'Filename: ' });
    filenameEl.createEl('code', { text: this.filename });
    
    const preview = contentEl.createEl('pre', { cls: 'csv-importer-preview-content' });
    preview.setText(this.content);
    
    const closeBtn = contentEl.createEl('button', { text: 'Close' });
    closeBtn.addClass('csv-importer-preview-close');
    closeBtn.onclick = () => this.close();
  }
}

export class ImportModal extends Modal {
  private plugin: CSVImporterPlugin;
  private fileInput!: HTMLInputElement;
  private droppedFile?: File;
  private titleInput!: HTMLInputElement;
  private folderInput!: HTMLInputElement;
  private delimiterInput!: HTMLInputElement;
  private templateInput!: HTMLTextAreaElement;

  constructor(app: App, plugin: CSVImporterPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // CSV file chooser
    const fileWrap = contentEl.createDiv({ cls: 'csv-importer-field csv-importer-file' });
    const inputId = `csv-file-input-${Date.now()}`;
    this.fileInput = fileWrap.createEl('input', { type: 'file' });
    this.fileInput.id = inputId;
    this.fileInput.addClass('csv-importer-file-input');
    const fileNameEl = fileWrap.createEl('span', { text: 'No file chosen' });
    fileNameEl.addClass('csv-importer-file-name');
    const fileLabel = fileWrap.createEl('label', { text: 'Select CSV', attr: { for: inputId } });
    fileLabel.addClass('csv-importer-file-button');
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
      const files = e.dataTransfer?.files;
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
    titleWrap.createEl('label', { text: 'Title column', attr: { for: 'title-col' } });
    this.titleInput = titleWrap.createEl('input', { type: 'text' });
    this.titleInput.addClass('csv-importer-input');
    this.titleInput.placeholder = 'Title or name (unique)';

    // Array delimiter
    const delimiterWrap = contentEl.createDiv({ cls: 'csv-importer-field' });
    delimiterWrap.createEl('label', { text: 'Array delimiter', attr: { for: 'delimiter' } });
    this.delimiterInput = delimiterWrap.createEl('input', { type: 'text' });
    this.delimiterInput.addClass('csv-importer-input');
    this.delimiterInput.placeholder = ',';
    this.delimiterInput.value = ',';

    // Output folder
    const folderWrap = contentEl.createDiv({ cls: 'csv-importer-field' });
    folderWrap.createEl('label', { text: 'Output folder', attr: { for: 'out-folder' } });
    this.folderInput = folderWrap.createEl('input', { type: 'text' });
    this.folderInput.addClass('csv-importer-input');
    this.folderInput.value = this.plugin.settings.outputFolder;
    new FolderSuggest(this.app, this.folderInput);

    // Template
    const templateWrap = contentEl.createDiv({ cls: 'csv-importer-field csv-importer-field-stacked' });
    templateWrap.createEl('label', { text: 'Body template (optional)', attr: { for: 'template' } });
    this.templateInput = templateWrap.createEl('textarea');
    this.templateInput.addClass('csv-importer-template');
    this.templateInput.placeholder = 'Leave empty for no body content';
    this.templateInput.value = this.plugin.settings.defaultTemplate;
    this.templateInput.rows = 4;

    // Buttons
    const buttonWrap = contentEl.createDiv({ cls: 'csv-importer-buttons' });
    const previewBtn = buttonWrap.createEl('button', { text: 'Preview' });
    previewBtn.addClass('csv-importer-preview');
    previewBtn.onclick = () => this.handlePreview();
    const submit = buttonWrap.createEl('button', { text: 'Import' });
    submit.addClass('csv-importer-submit');
    submit.onclick = () => this.handleImport();
  }

  async handlePreview() {
    try {
      const file = this.droppedFile ?? this.fileInput.files?.[0];
      const titleColumn = this.titleInput.value.trim();
      const arrayDelimiter = this.delimiterInput.value.trim();
      const template = this.templateInput.value.trim();
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

      if (template) {
        try {
          const normalizedRow: Record<string, string> = {};
          for (const [key, value] of Object.entries(rows[0])) {
            const normalizedKey = key.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            normalizedRow[normalizedKey] = value;
          }
          const compiled = Handlebars.compile(template, { noEscape: true });
          compiled(normalizedRow);
        } catch (e) {
          const normalizedKeysList = Object.keys(rows[0]).map(k => 
            `"${k}" → {{${k.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}}}`
          ).join(', ');
          new Notice(`Template error: ${e instanceof Error ? e.message : 'Invalid template syntax'}. Available fields: ${normalizedKeysList}`, 10000);
          return;
        }
      }

      const title = (rows[0][titleColumn] || 'Untitled').toString();
      const filename = `${sanitizeFilename(title)}${getYearSuffix(rows[0])}.md`;
      const content = generateNoteContent(rows[0], arrayDelimiter, template);

      new PreviewModal(this.app, filename, content).open();
    } catch (e) {
      console.error('Preview failed:', e);
      new Notice('Failed to generate preview');
    }
  }

  async handleImport() {
    try {
      const file = this.droppedFile ?? this.fileInput.files?.[0];
      const titleColumn = this.titleInput.value.trim();
      const outFolder = this.folderInput.value.trim() || this.plugin.settings.outputFolder;
      const arrayDelimiter = this.delimiterInput.value.trim();
      const template = this.templateInput.value.trim();
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

      if (template) {
        try {
          const normalizedRow: Record<string, string> = {};
          const normalizedKeys: string[] = [];
          for (const [key, value] of Object.entries(rows[0])) {
            const normalizedKey = key.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            normalizedRow[normalizedKey] = value;
            normalizedKeys.push(normalizedKey);
          }
          const compiled = Handlebars.compile(template);
          compiled(normalizedRow);
        } catch (e) {
          const normalizedKeysList = Object.keys(rows[0]).map(k => 
            `"${k}" → {{${k.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}}}`
          ).join(', ');
          new Notice(`Template error: ${e instanceof Error ? e.message : 'Invalid template syntax'}. Available fields: ${normalizedKeysList}`, 10000);
          return;
        }
      }

      let created = 0;
      for (const row of rows) {
        const title = (row[titleColumn] || 'Untitled').toString();
        const filename = `${sanitizeFilename(title)}${getYearSuffix(row)}.md`;
        const content = generateNoteContent(row, arrayDelimiter, template);
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

