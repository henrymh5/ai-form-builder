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
  ]),
  {
    // Public renderer routes must never pull in the builder bundle (dnd-kit,
    // the Zustand builder store, or the builder feature) — see plan §11.3.
    files: ["src/app/f/**/*.{ts,tsx}", "src/app/embed/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@dnd-kit/core", message: "The public renderer must not bundle dnd-kit." },
          ],
          patterns: [
            {
              group: ["@/features/form-builder", "@/features/form-builder/*"],
              message: "The public renderer must not import the builder feature (separate bundle).",
            },
          ],
        },
      ],
    },
  },
  {
    // The Supabase service-role client bypasses RLS and must only be
    // imported from the data-access layer — see plan §2.3 / §14.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db/service-client", "@/lib/db/service-client*"],
              message:
                "The Supabase service-role client is restricted to src/lib/db — route handlers must call a repository function instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
