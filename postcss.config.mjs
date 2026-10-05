/**
 * ترتیب مهم است:
 */
import path from "node:path";

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    [path.resolve(process.cwd(), "postcss-legacy-compat.cjs")]: {},
    "postcss-lightningcss": {},
  },
};
export default config;
