// Pure verification logic, shared by the browser and the automated tests.

const HASH_WITH_PREFIX = /0x[0-9a-fA-F]{64}(?![0-9a-fA-F])/;
const BARE_HASH = /^[0-9a-fA-F]{64}$/;

/**
 * Extracts the certificate fingerprint from what the user pasted: the verification link,
 * a link with ?hash=, or the bare code. Returns a lower-case 0x-prefixed hash or null.
 */
export function parseCertificateHash(input) {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (text === "") return null;
  if (BARE_HASH.test(text)) return "0x" + text.toLowerCase();
  const match = text.match(HASH_WITH_PREFIX);
  return match ? match[0].toLowerCase() : null;
}

/** Status shown to the visitor from the answer of ChambitaCertificate.verify(hash). */
export function classify(onChain) {
  if (!onChain || !onChain.exists) return "NOT_AUTHENTIC";
  return onChain.revoked ? "REVOKED" : "VALID";
}

/** Converts the tuple returned by the contract into plain values. */
export function fromContractResult(result) {
  const [exists, revoked, tokenId, holder, issuedAt, revokedAt] = result;
  return {
    exists: Boolean(exists),
    revoked: Boolean(revoked),
    tokenId: tokenId.toString(),
    holder,
    issuedAt: Number(issuedAt) > 0 ? new Date(Number(issuedAt) * 1000) : null,
    revokedAt: Number(revokedAt) > 0 ? new Date(Number(revokedAt) * 1000) : null,
  };
}

/** Descriptive data from the API is only used when it describes the same certificate. */
export function matchingDetails(hash, details) {
  if (!details || typeof details.certificateHash !== "string") return null;
  return details.certificateHash.toLowerCase() === hash ? details : null;
}

/** Runs the tasks in order and returns the first successful result (fallback between RPC endpoints). */
export async function firstSuccessful(tasks) {
  const errors = [];
  for (const task of tasks) {
    try {
      return await task();
    } catch (error) {
      errors.push(error);
    }
  }
  const failure = new Error("All endpoints failed");
  failure.causes = errors;
  throw failure;
}

/** Rejects the promise when it does not settle in time. */
export function withTimeout(promise, milliseconds) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout")), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
