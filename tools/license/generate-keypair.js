const fs = require("fs");
const path = require("path");
const { generateKeyPair } = require("./license-core");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const outDir = path.resolve(argValue("out", "license-keys"));
if (fs.existsSync(outDir) && fs.readdirSync(outDir).length) {
  console.error(`目录不为空：${outDir}`);
  console.error("为避免覆盖密钥，请换一个 --out 目录。");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const { privateKey, publicKey } = generateKeyPair();
fs.writeFileSync(path.join(outDir, "private.pem"), privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(outDir, "public.pem"), publicKey);

console.log("授权密钥已生成：");
console.log(`私钥：${path.join(outDir, "private.pem")}`);
console.log(`公钥：${path.join(outDir, "public.pem")}`);
console.log("");
console.log("注意：private.pem 只能放在你或销售人员电脑里，不要打包给客户。");
