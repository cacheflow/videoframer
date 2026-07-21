import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("package metadata exposes the generated ESM build and declarations", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8"),
  );

  assert.equal(packageJson.main, "./dist/app.js");
  assert.equal(packageJson.types, "./dist/app.d.ts");
  assert.equal(packageJson.exports["."].import, "./dist/app.js");
  assert.equal(packageJson.exports["."].types, "./dist/app.d.ts");
});

test("build output can be imported and includes type declarations", async () => {
  const builtEntry = path.join(projectRoot, "dist", "app.js");
  const declarations = path.join(projectRoot, "dist", "app.d.ts");

  await Promise.all([access(builtEntry), access(declarations)]);

  const builtPackage = await import(`${builtEntry}?test=${Date.now()}`);
  assert.equal(typeof builtPackage.VideoAnalyzer, "function");
});
