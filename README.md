# Obsidian CSV Importer

Import a CSV file to create Obsidian notes. Each CSV column becomes a YAML property on the created note. This makes the notes immediately usable with **Obsidian Bases**—so you can filter, sort, and query on any column from your CSV.

![Demo](media/plugin-ui.png)

## Features

- **YAML frontmatter**: All CSV columns become YAML properties
- **Array delimiter**: Split values into arrays using comma, semicolon, or pipe delimiters
- **Custom templates**: Use Handlebars syntax to format note bodies
- **Preview**: See the first note before importing
- **Year suffix**: Automatically adds year to titles when available

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

- Run the command: "CSV Importer: Import CSV to notes".
- Select your CSV file and specify the title column (`title`).
- **Array delimiter**: Change from comma to semicolon/pipe if your data contains addresses or descriptions with commas.
- **Body template** (optional): Use Handlebars syntax to customize note content with `{{field_name}}` placeholders.
- Click **Preview** to see the first note before importing, or **Import** to create all notes.