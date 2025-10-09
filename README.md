# Obsidian CSV Importer

Import a CSV file to create Obsidian notes. Each CSV column becomes a YAML property on the created note. This makes the notes immediately usable with **Obsidian Bases**—so you can filter, sort, and query on any column from your CSV.

![Demo](media/plugin-ui.png)

## CSV Ideas

- Films / TV shows
- Board game collection
- Favorite books
- Contacts (name, email, notes)
- Travel itinerary (location, date, notes)

and much more!

## How It Works

**Transform your CSV data into structured Obsidian notes**

### From CSV

![Books](media/books-csv.png)

### To Markdown Notes

![Books](media/books-md.png)

## Usage

- Run the command: “CSV Importer: Import CSV to notes”.
- Choose the CSV file, enter the title column (e.g., `title`), and set the output folder.
- The plugin will generate one note per row.