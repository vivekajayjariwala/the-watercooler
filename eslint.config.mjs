import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The 2022 hackathon build, kept for reference only. It is CommonJS, it is
    // not imported by anything in `src/`, and it does not ship — linting it to
    // modern rules would only ever produce noise.
    "legacy_code/**",
  ]),
  {
    rules: {
      // A leading underscore is how this codebase says "destructured only to
      // drop it" — `const { initiator: _i, ...chat } = row`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
