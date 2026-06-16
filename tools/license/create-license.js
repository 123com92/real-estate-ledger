const fs = require("fs");
const path = require("path");
const { createLicensePayload, formatMachineCode, signLicense } = require("./license-core");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
生成授权码：
node tools/license/create-license.js --private-key license-keys/private.pem --machine MACHINE-1234 --customer "张三房产"

可选参数：
  --plan lifetime|yearly|trial
  --expires 2027-05-22
  --communities 0      0 表示不限制
  --properties 0       0 表示不限制
  --transactions 0     0 表示不限制
  --note "备注"
  --json               输出完整 JSON
`);
}

if (hasFlag("help") || hasFlag("h")) {
  usage();
  process.exit(0);
}

const privateKeyPath = argValue("private-key");
const machineCode = argValue("machine");
const customer = argValue("customer");

if (!privateKeyPath || !machineCode || !customer) {
  usage();
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(path.resolve(privateKeyPath), "utf8");
const payload = createLicensePayload({
  machineCode,
  customer,
  plan: argValue("plan", "single-machine"),
  expiresAt: argValue("expires") || null,
  communities: argValue("communities"),
  properties: argValue("properties"),
  transactions: argValue("transactions"),
  note: argValue("note"),
});
const licenseCode = signLicense(payload, privateKeyPem);

if (hasFlag("json")) {
  console.log(JSON.stringify({ licenseCode, payload }, null, 2));
} else {
  console.log("授权码：");
  console.log(licenseCode);
  console.log("");
  console.log(`客户：${payload.customer}`);
  console.log(`机器码：${formatMachineCode(payload.machineCode)}`);
  console.log(`到期时间：${payload.expiresAt || "永久"}`);
}
