import fs from "node:fs";
import path from "node:path";

const nativePath = path.resolve("node_modules/rollup/dist/native.js");

if (!fs.existsSync(nativePath)) {
  process.exit(0);
}

const replacement = `const wasmNode = require("@rollup/wasm-node/dist/native.js");

exports.parse = wasmNode.parse;
exports.parseAsync = wasmNode.parseAsync;
exports.xxhashBase64Url = wasmNode.xxhashBase64Url;
exports.xxhashBase36 = wasmNode.xxhashBase36;
exports.xxhashBase16 = wasmNode.xxhashBase16;
`;

const current = fs.readFileSync(nativePath, "utf8");

if (current === replacement) {
  process.exit(0);
}

fs.writeFileSync(nativePath, replacement, "utf8");
console.log("Patched rollup to use @rollup/wasm-node.");
