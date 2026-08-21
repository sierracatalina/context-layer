import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "coverage/**",
    "dist/**",
    ".next/**",
    ".vinext/**",
    ".vercel/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
  ]),
  eslint.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
]);
