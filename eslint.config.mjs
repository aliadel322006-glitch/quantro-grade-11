import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

const { flatConfig } = nextPlugin;

export default defineConfig([
  globalIgnores([".next/**", ".next-local/**", "node_modules/**", "out/**", "coverage/**", "playwright-report/**"]),
  flatConfig.coreWebVitals,
]);
