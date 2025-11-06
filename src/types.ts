export interface CSVImporterSettings {
  outputFolder: string;
  defaultTemplate: string;
}

export const DEFAULT_SETTINGS: CSVImporterSettings = {
  outputFolder: 'CSV Imports',
  defaultTemplate: ''
};

