import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  rpc,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "./wallets";
import type { PollInfo, PollResults } from "../types";

const RPC_URL = "https://soroban-testnet.stellar.org";
const HORIZON_URL = "https://horizon-testnet.stellar.org";

const server = new Horizon.Server(HORIZON_URL);
const sorobanServer = new rpc.Server(RPC_URL);
const DUMMY_KEY = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

export function truncateKey(key: string): string {
  if (!key) return "";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function simulateReadCall(
  contractId: string,
  func: string,
  args: xdr.ScVal[]
): Promise<any> {
  const account = await server.loadAccount(DUMMY_KEY);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: func,
        args,
      })
    )
    .setTimeout(30)
    .build();

  const simulated = await sorobanServer.simulateTransaction(tx);
  if ("error" in simulated) return null;

  const simResult = simulated as any;
  if (!simResult.result?.retval) return null;
  return scValToNative(simResult.result.retval);
}

async function simulateAndSend(
  tx: any,
  signer: string
): Promise<{ hash: string; error?: string }> {
  const simulated = await sorobanServer.simulateTransaction(tx);
  if ("error" in simulated) {
    return { hash: "", error: String(simulated.error) };
  }

  const simResult = simulated as any;
  const txBuilt = rpc.assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(txBuilt.toXDR(), {
    networkPassphrase: Networks.TESTNET,
    address: signer,
  });

  const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as any;
  const response = await sorobanServer.sendTransaction(signedTx);

  if (response.status === "PENDING" || response.status === "DUPLICATE") {
    return { hash: response.hash };
  }

  const errResult = response as any;
  return { hash: "", error: errResult.errorResult || "Transaction failed" };
}

export async function waitForTxConfirmation(
  hash: string,
  maxRetries = 15,
  intervalMs = 2000
): Promise<{ status: "confirmed" | "failed"; error?: string }> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sorobanServer.getTransaction(hash);
      if (result.status === "SUCCESS") {
        return { status: "confirmed" };
      }
      if (result.status === "FAILED") {
        return { status: "failed", error: "Transaction failed on ledger" };
      }
    } catch {
      // network error, retry
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: "failed", error: "Transaction confirmation timed out" };
}

export async function createPoll(
  owner: string,
  question: string,
  options: string[],
  deadline: number,
  contractId: string
): Promise<{ txHash: string; error?: string }> {
  try {
    const account = await server.loadAccount(owner);

    const questionVal = nativeToScVal(question, { type: "string" });
    const optionVals = options.map((o: string) =>
      nativeToScVal(o, { type: "string" })
    );
    const optionsVec = xdr.ScVal.scvVec(optionVals);
    const deadlineVal = nativeToScVal(deadline, { type: "u64" });
    const ownerAddr = new Address(owner).toScVal();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: "initialize",
          args: [ownerAddr, questionVal, optionsVec, deadlineVal],
        })
      )
      .setTimeout(30)
      .build();

    const result = await simulateAndSend(tx, owner);
    return { txHash: result.hash, error: result.error };
  } catch (e: any) {
    let msg = "Failed to create poll";
    if (e?.response?.data?.extras?.result_codes) {
      msg = `Contract error: ${JSON.stringify(e.response.data.extras.result_codes)}`;
    } else if (e?.message) {
      msg = e.message;
    }
    return { txHash: "", error: msg };
  }
}

export async function castVote(
  voter: string,
  optionIndex: number,
  contractId: string
): Promise<{ txHash: string; error?: string }> {
  try {
    const account = await server.loadAccount(voter);
    const optionVal = nativeToScVal(optionIndex, { type: "u32" });
    const voterAddr = new Address(voter).toScVal();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: "vote",
          args: [voterAddr, optionVal],
        })
      )
      .setTimeout(30)
      .build();

    const result = await simulateAndSend(tx, voter);
    return { txHash: result.hash, error: result.error };
  } catch (e: any) {
    let msg = "Failed to cast vote";
    if (e?.message?.includes("already voted")) {
      msg = "You have already voted on this poll.";
    } else if (e?.message?.includes("voting has ended")) {
      msg = "This poll has ended.";
    } else if (e?.message) {
      msg = e.message;
    }
    return { txHash: "", error: msg };
  }
}

export async function getPollInfo(contractId: string): Promise<PollInfo | null> {
  try {
    const parsed = await simulateReadCall(contractId, "get_poll", []);
    if (!parsed) return null;

    return {
      question: String(parsed.question || ""),
      options: Array.isArray(parsed.options)
        ? parsed.options.map(String)
        : [],
      deadline: Number(parsed.deadline || 0),
      owner: String(parsed.owner || ""),
      totalVotes: Number(parsed.total_votes || 0),
    };
  } catch {
    return null;
  }
}

export async function getResults(
  contractId: string,
  optionCount: number
): Promise<PollResults | null> {
  try {
    const votes = await simulateReadCall(contractId, "get_results", [
      nativeToScVal(optionCount, { type: "u32" }),
    ]);
    if (!votes || !Array.isArray(votes)) return null;
    return { votes: votes.map(Number) };
  } catch {
    return null;
  }
}

export async function hasVoted(
  contractId: string,
  voter: string
): Promise<boolean> {
  try {
    const voterAddr = new Address(voter).toScVal();
    const result = await simulateReadCall(contractId, "has_voted", [
      voterAddr,
    ]);
    return result === true;
  } catch {
    return false;
  }
}

export async function fetchBalance(
  publicKey: string
): Promise<{ balance: string; isError: boolean }> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(
      (b: any) => b.asset_type === "native"
    );
    return {
      balance: xlmBalance ? xlmBalance.balance : "0",
      isError: false,
    };
  } catch {
    return { balance: "0", isError: true };
  }
}

export function buildExplorerUrl(
  type: "tx" | "account" | "contract",
  id: string
): string {
  return `https://stellar.expert/explorer/testnet/${type}/${id}`;
}
