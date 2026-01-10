import { App, PluginSettingTab, Setting } from 'obsidian';
import type CSVImporterPlugin from './main';
import { FolderSuggest } from './utils';

export class CSVImporterSettingTab extends PluginSettingTab {
  plugin: CSVImporterPlugin;

  constructor(app: App, plugin: CSVImporterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    new Setting(containerEl)
      .setName('Default output folder')
      .addText((t) => {
        t.setPlaceholder('CSV imports')
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (v) => {
            this.plugin.settings.outputFolder = v;
            await this.plugin.saveSettings();
          });
        new FolderSuggest(this.app, t.inputEl);
      });
    
    new Setting(containerEl)
      .setName('Custom template')
      .setDesc('Default md template using handlebars syntax.')
      .addTextArea(t => {
        t.setPlaceholder('# {{title}}\n');
        t.setValue(this.plugin.settings.defaultTemplate);
        t.onChange(async (v) => { this.plugin.settings.defaultTemplate = v; await this.plugin.saveSettings(); });
        t.inputEl.rows = 10;
        t.inputEl.addClass('csv-importer-template');
      });
  }
}

