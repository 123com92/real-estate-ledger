const crypto = require("crypto");

const LICENSE_PREFIX = "REL1";

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseBase64urlJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function normalizeMachineCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatMachineCode(value) {
  const clean = normalizeMachineCode(value);
  return clean.match(/.{1,4}/g)?.join("-") || "";
}

function createLicensePayload(options) {
  const machineCode = normalizeMachineCode(options.machineCode);
  if (!machineCode) throw new Error("machineCode is required");
  if (!options.customer) throw new Error("customer is required");

  const issuedAt = options.issuedAt || new Date().toISOString();
  return {
    version: 1,
    product: "real-estate-ledger",
    customer: String(options.customer).trim(),
    machineCode,
    plan: options.plan || "single-machine",
    issuedAt,
    expiresAt: options.expiresAt || null,
    limits: {
      communities: Number(options.communities || 0) || null,
      properties: Number(options.properties || 0) || null,
      transactions: Number(options.transactions || 0) || null,
    },
    note: options.note ? String(options.note).trim() : "",
  };
}

function signLicense(payload, privateKeyPem) {
  const encodedPayload = base64urlJson(payload);
  const signature = crypto.sign(null, Buffer.from(encodedPayload), privateKeyPem).toString("base64url");
  return `${LICENSE_PREFIX}.${encodedPayload}.${signature}`;
}

function verifyLicense(licenseCode, publicKeyPem, expectedMachineCode = "") {
  const [prefix, encodedPayload, signature] = String(licenseCode || "").trim().split(".");
  if (prefix !== LICENSE_PREFIX || !encodedPayload || !signature) {
    return { ok: false, reason: "授权码格式不正确" };
  }

  const validSignature = crypto.verify(
    null,
    Buffer.from(encodedPayload),
    publicKeyPem,
    Buffer.from(signature, "base64url"),
  );
  if (!validSignature) return { ok: false, reason: "授权码签名无效" };

  const payload = parseBase64urlJson(encodedPayload);
  const expected = normalizeMachineCode(expectedMachineCode);
  if (expected && normalizeMachineCode(payload.machineCode) !== expected) {
    return { ok: false, reason: "授权码不属于这台电脑", payload };
  }
  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "授权码已过期", payload };
  }
  return { ok: true, payload };
}

function generateKeyPair() {
  return crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
}

module.exports = {
  createLicensePayload,
  formatMachineCode,
  generateKeyPair,
  normalizeMachineCode,
  signLicense,
  verifyLicense,
};
