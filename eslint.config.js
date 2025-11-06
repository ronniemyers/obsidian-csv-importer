import obsidianmd from "eslint-plugin-obsidianmd";
import prettierConfig from "eslint-config-prettier";

import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([

	globalIgnores([
		"node_modules/",
		"main.js",
		"*.mjs"
	]),
	
	{
		files: [ "**/*.ts" ],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module"
			},
		},
		plugins: { 
			obsidianmd,
			"@typescript-eslint": tsPlugin
		},
	},
	...obsidianmd.configs.recommended,
	prettierConfig

]);