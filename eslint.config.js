/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] },
  ...require("typescript-eslint").configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
