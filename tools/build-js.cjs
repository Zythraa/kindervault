const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "pages");
const outputDir = path.join(root, "assets", "js", "dist");
const sources = [
  "shared.jsx",
  "dashboard.jsx",
  "classes.jsx",
  "students.jsx",
  "payments.jsx",
  "receipts.jsx",
  "development.jsx",
  "backup.jsx",
  "settings.jsx",
  "app.jsx",
];

fs.mkdirSync(outputDir, { recursive: true });

for (const sourceName of sources) {
  const sourcePath = path.join(sourceDir, sourceName);
  const outputPath = path.join(outputDir, sourceName.replace(/\.jsx$/, ".js"));
  const result = babel.transformFileSync(sourcePath, {
    babelrc: false,
    configFile: false,
    comments: false,
    compact: false,
    presets: [["@babel/preset-react", { runtime: "classic" }]],
    sourceMaps: false,
    sourceType: "script",
  });

  if (!result || typeof result.code !== "string") {
    throw new Error(`Babel did not produce output for ${sourceName}`);
  }

  fs.writeFileSync(outputPath, `${result.code}\n`);
}

const scannerSource = path.join(sourceDir, "registration_scanner.jsx");
if (fs.existsSync(scannerSource)) {
  const scannerOutputDir = path.join(root, "assets", "js", "dev");
  const scannerResult = babel.transformFileSync(scannerSource, {
    babelrc: false,
    configFile: false,
    comments: false,
    compact: false,
    presets: [["@babel/preset-react", { runtime: "classic" }]],
    sourceMaps: false,
    sourceType: "script",
  });
  if (!scannerResult || typeof scannerResult.code !== "string") {
    throw new Error("Babel did not produce output for registration_scanner.jsx");
  }
  fs.mkdirSync(scannerOutputDir, { recursive: true });
  fs.writeFileSync(path.join(scannerOutputDir, "registration_scanner.js"), `${scannerResult.code}\n`);
}

console.log(`Compiled ${sources.length} JSX sources into assets/js/dist.`);
