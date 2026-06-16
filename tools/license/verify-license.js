const fs = require("fs");
const path = require("path");
const { formatMachineCode, verifyLicense } = require("./license-core");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function usage() {
  console.log(`
校验授权码：
node tools/license/verify-license.js --public-key license-keys/public.pem --license "REL1.xxx.yyy"

可选参数：
  --machine MACHINE-1234   同时校验是否属于指定机器
`);
}

const publicKeyPath = argValue("public-key");
const licenseCode = argValue("license");

if (!publicKeyPath || !licenseCode) {
  usage();
  process.exit(1);
}

const publicKeyPem = fs.readFileSync(path.resolve(publicKeyPath), "utf8");
const result = verifyLicense(licenseCode, publicKeyPem, argValue("machine"));

if (!result.ok) {
  console.error(`校验失败：${result.reason}`);
  if (result.payload) console.error(JSON.stringify(result.payload, null, 2));
  process.exit(1);
}

console.log("校验通过");
console.log(`客户：${result.payload.customer}`);
console.log(`机器码：${formatMachineCode(result.payload.machineCode)}`);
console.log(`到期时间：${result.payload.expiresAt || "永久"}`);
console.log(JSON.stringify(result.payload, null, 2));
