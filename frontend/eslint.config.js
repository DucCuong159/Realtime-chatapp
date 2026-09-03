import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", ".yarn", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Trigger a warning if a function's Cyclomatic Complexity exceeds 20.
      complexity: ["warn", { max: 20 }],
      // Trigger a warning if a function exceeds 100 lines of code (FLOC).
      "max-lines-per-function": [
        "warn",
        { max: 100, skipComments: true, skipBlankLines: true },
      ],
      // Trigger a warning if a file exceeds 600 lines of code (LOC).
      "max-lines": [
        "warn",
        { max: 600, skipComments: true, skipBlankLines: true },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
