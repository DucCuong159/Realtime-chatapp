import path from "node:path";

export default {
  "frontend/**/*.{ts,tsx}": (filenames) => {
    const frontendDir = path.resolve("frontend");
    const files = filenames
      .map((f) => path.relative(frontendDir, path.resolve(f)).replace(/\\/g, "/"))
      .map((f) => `"${f}"`)
      .join(" ");
    return `yarn --cwd frontend run eslint --cache --max-warnings=0 --fix ${files}`;
  },
};