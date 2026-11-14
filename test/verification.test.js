import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, firstSuccessful, fromContractResult, matchingDetails, parseCertificateHash, withTimeout } from "../js/verification.js";
import { detectLanguage, messages, translate } from "../js/i18n.js";

const HASH = "0x" + "ab".repeat(32);

test("extracts the hash from the verification link", () => {
  assert.equal(parseCertificateHash(`https://chambita-verification-portal.vercel.app/?hash=${HASH}`), HASH);
});

test("accepts the bare code with or without 0x and normalizes it", () => {
  assert.equal(parseCertificateHash(HASH.toUpperCase().replace("0X", "0x")), HASH);
  assert.equal(parseCertificateHash("  " + "AB".repeat(32) + " "), HASH);
});

test("rejects incomplete or altered codes", () => {
  assert.equal(parseCertificateHash(""), null);
  assert.equal(parseCertificateHash("0x1234"), null);
  assert.equal(parseCertificateHash(HASH + "ff"), null);
  assert.equal(parseCertificateHash(undefined), null);
});

test("classifies valid, revoked and not authentic certificates", () => {
  assert.equal(classify({ exists: true, revoked: false }), "VALID");
  assert.equal(classify({ exists: true, revoked: true }), "REVOKED");
  assert.equal(classify({ exists: false, revoked: false }), "NOT_AUTHENTIC");
  assert.equal(classify(null), "NOT_AUTHENTIC");
});

test("converts the contract tuple with unix timestamps", () => {
  const value = fromContractResult([true, false, 7n, "0x0000000000000000000000000000000000000001", 1767225600n, 0n]);
  assert.equal(value.tokenId, "7");
  assert.equal(value.issuedAt.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(value.revokedAt, null);
});

test("ignores API details of another certificate", () => {
  assert.equal(matchingDetails(HASH, { certificateHash: "0x" + "cd".repeat(32) }), null);
  assert.deepEqual(matchingDetails(HASH, { certificateHash: HASH.toUpperCase().replace("0X", "0x"), score: 5 }).score, 5);
});

test("falls back to the next RPC endpoint when the first one fails (QA02)", async () => {
  const result = await firstSuccessful([
    async () => { throw new Error("alchemy down"); },
    async () => "public node",
  ]);
  assert.equal(result, "public node");
  await assert.rejects(firstSuccessful([async () => { throw new Error("down"); }]));
});

test("times out slow endpoints", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 20), /Timeout/);
});

test("has the same keys in Spanish and English", () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.es).sort());
  assert.equal(translate("en", "result.scoreValue", { score: 5 }), "5 out of 5");
  assert.equal(detectLanguage(null, ["en-US"]), "en");
  assert.equal(detectLanguage(null, ["es-PE"]), "es");
  assert.equal(detectLanguage("en", ["es-PE"]), "en");
});
