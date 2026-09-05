import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "frontend/.next/"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["frontend/**/*.ts", "frontend/**/*.tsx"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["frontend/*.cjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
);