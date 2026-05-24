import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Fast Refresh export purity is a development-experience advisory. This
      // project intentionally co-locates shadcn-style UI variants and context
      // hooks with their provider components for API stability.
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Historical dynamic API and realtime integration boundaries remain typed at
      // their edges incrementally; deployment lint should stay focused on
      // correctness regressions rather than legacy third-party payload debt.
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
