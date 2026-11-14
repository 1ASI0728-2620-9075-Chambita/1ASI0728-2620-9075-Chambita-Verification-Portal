// Public configuration of the verification portal. None of these values is secret.
export const config = {
  chainId: 11155111, // Ethereum Sepolia
  // Address of ChambitaCertificate on Sepolia (filled after the deployment of the smart contract).
  contractAddress: "0x0000000000000000000000000000000000000000",
  // JSON-RPC endpoints, tried in order. Add the Alchemy URL with a domain-restricted key first;
  // the public endpoints keep the portal working if Alchemy is not available (QA02).
  rpcUrls: [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://sepolia.drpc.org",
  ],
  rpcTimeoutMs: 6000,
  // Chambita API, used only for descriptive data (title, category, score). Optional (QA02).
  apiBaseUrl: "https://chambita-web-services.vercel.app",
  apiTimeoutMs: 4000,
  explorerUrl: "https://sepolia.etherscan.io",
  landingUrl: "https://chambita-landing-page.vercel.app",
};
