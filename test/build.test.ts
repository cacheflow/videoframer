import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("package metadata exposes the ESM build and declarations", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8"),
  );

  assert.equal(packageJson.main, "./dist/esm/app.js");
  assert.equal(packageJson.types, "./dist/esm/app.d.ts");
  assert.equal(packageJson.exports["."].types, "./dist/esm/app.d.ts");
  assert.equal(packageJson.exports["."].import, "./dist/esm/app.js");
});

test("ESM build can be imported and includes all declaration files", async () => {
  const builtEntry = path.join(projectRoot, "dist", "esm", "app.js");
  const declarations = path.join(projectRoot, "dist", "esm", "app.d.ts");
  const internalTypes = path.join(
    projectRoot,
    "dist",
    "esm",
    "types",
    "app.d.ts",
  );

  await Promise.all([
    access(builtEntry),
    access(declarations),
    access(internalTypes),
  ]);

  const builtPackage = await import(`${builtEntry}?test=${Date.now()}`);
  assert.equal(typeof builtPackage.Videoframer, "function");
});

test("package exports route imports to the ESM build", async () => {
  const importedPackage = await import("videoframer");

  assert.equal(typeof importedPackage.Videoframer, "function");
});
