// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  // Custom rules for layout primitive enforcement
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      // Disallow raw <Text> - use <AppText> instead for consistent typography
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXOpeningElement[name.name='Text']",
          message: "Use <AppText> instead of <Text> for consistent typography. Import from 'components/common'."
        }
      ],
    },
  },
]);
