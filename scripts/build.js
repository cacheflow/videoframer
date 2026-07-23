import { execFile } from "node:child_process";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(projectRoot, "dist");

await rm(outputDirectory, { recursive: true, force: true });
const esmDirectory = path.join(outputDirectory, "esm");
const sourceTypes = path.join(projectRoot, "types", "app.d.ts");

const tsc = path.join(
  projectRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

await execFileAsync(
  process.execPath,
  [tsc, "--project", path.join(projectRoot, "tsconfig.build.json")],
  { cwd: projectRoot },
);

const typesDirectory = path.join(esmDirectory, "types");
await mkdir(typesDirectory, { recursive: true });
await copyFile(sourceTypes, path.join(typesDirectory, "app.d.ts"));

await writeFile(
  path.join(esmDirectory, "package.json"),
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
);

console.log("Built Videoframer into dist/esm");
