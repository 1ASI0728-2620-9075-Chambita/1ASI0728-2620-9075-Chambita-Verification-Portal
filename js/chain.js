// Reads ChambitaCertificate directly from Ethereum Sepolia, without going through Chambita servers.
import { Contract, JsonRpcProvider, Network } from "../vendor/ethers-6.15.0.min.js";
import { firstSuccessful, fromContractResult, withTimeout } from "./verification.js";

const ABI = [
  "function verify(bytes32 certificateHash) view returns (bool exists, bool revoked, uint256 tokenId, address holder, uint64 issuedAt, uint64 revokedAt)",
];

export async function verifyOnChain(hash, { rpcUrls, contractAddress, chainId, rpcTimeoutMs }) {
  const network = Network.from(chainId);
  const tasks = rpcUrls.map((url) => async () => {
    const provider = new JsonRpcProvider(url, network, { staticNetwork: network });
    try {
      const contract = new Contract(contractAddress, ABI, provider);
      return fromContractResult(await withTimeout(contract.verify(hash), rpcTimeoutMs));
    } finally {
      provider.destroy();
    }
  });
  return firstSuccessful(tasks);
}
