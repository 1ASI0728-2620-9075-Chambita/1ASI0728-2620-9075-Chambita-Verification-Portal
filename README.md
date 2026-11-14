# Chambita · Verification Portal

Public portal where an employer verifies a Chambita experience certificate **directly on Ethereum Sepolia**,
without an account and without depending on Chambita servers (US36, TS12, QA02).

## How it works

1. The visitor pastes the verification link (`https://<portal>/?hash=0x…`), the link from the QR code or the bare code.
2. `js/chain.js` calls `verify(bytes32)` of the `ChambitaCertificate` contract with Ethers.js v6, trying each
   JSON-RPC endpoint of `js/config.js` in order (Alchemy first, public nodes as fallback).
3. The result is **authentic**, **revoked** (with the revocation date) or **not authentic**.
4. In parallel, the portal asks the Chambita API (`GET /api/v1/public/certificates/{hash}`) for descriptive data
   (project title, category, score, transaction). If the API does not answer, authenticity is still shown with the
   on-chain data only.

No personal data is stored on-chain: only the certificate fingerprint and a pseudonymous holder address.

## Structure

| Path | Content |
|------|---------|
| `index.html`, `styles.css` | Screens P01 (verify) and P02 (result), responsive and accessible |
| `js/config.js` | Public configuration: contract address, RPC endpoints, API URL |
| `js/verification.js` | Pure logic: parsing of links and codes, classification, RPC fallback, timeouts |
| `js/chain.js` | Reading of the contract with Ethers.js |
| `js/i18n.js` | Texts in es_419 and en_US |
| `vendor/ethers-6.15.0.min.js` | Ethers.js v6 bundled locally so the portal does not depend on a CDN |
| `test/` | Unit tests with the Node.js test runner |

## Configuration

After deploying the smart contract, set `contractAddress` in `js/config.js`. To use Alchemy, create a key restricted
to the portal domain and add its URL as the first item of `rpcUrls`.

## Run and test

```bash
npm start   # http://localhost:5500
npm test
```

## Deployment

Static site on Vercel (no build step). `vercel.json` enables clean URLs and security headers.

## Conventions

GitFlow, Semantic Versioning and Conventional Commits. Code in English; texts in es_419 and en_US.
