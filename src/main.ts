import { Plugin, TFile, normalizePath } from 'obsidian';
import { CSVImporterSettings, DEFAULT_SETTINGS } from './types';
import { ImportModal } from './ImportModal';
import { CSVImporterSettingTab } from './SettingsTab';

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
      },
    });

    this.addSettingTab(new CSVImporterSettingTab(this.app, this));
  }

  async ensureFolder(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    if (!this.app.vault.getAbstractFileByPath(normalized)) {
      await this.app.vault.createFolder(normalized);
    }
  }

  async createNote(
    filename: string,
    content: string,
    folder: string
  ): Promise<void> {
    await this.ensureFolder(folder);
    const fullPath = normalizePath(`${folder}/${filename}`);
    const existing = this.app.vault.getAbstractFileByPath(fullPath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(fullPath, content);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async loadSettings() {
    const data = (await this.loadData()) as CSVImporterSettings | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }
}
