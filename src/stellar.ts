import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  StrKey,
} from "@stellar/stellar-sdk";

const SERVER_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(SERVER_URL);

export async function checkFreighterConnection(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<string> {
  try {
    const result = await requestAccess();
    if (result.error) {
      throw new Error(result.error);
    }
    if (!result.address) {
      throw new Error("No address returned. Make sure Freighter is unlocked.");
    }
    return result.address;
  } catch (e: any) {
    if (e.message) throw e;
    throw new Error(
      "Failed to connect wallet. Make sure Freighter is installed and unlocked."
    );
  }
}

export function truncateKey(key: string): string {
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export async function fetchBalance(
  publicKey: string
): Promise<{ balance: string; isError: boolean }> {
  if (!publicKey || !StrKey.isValidEd25519PublicKey(publicKey)) {
    return { balance: "0", isError: true };
  }
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

export async function sendXLM(
  senderPublicKey: string,
  destination: string,
  amount: string
): Promise<{ hash: string; error?: string }> {
  if (!destination || !amount) {
    return { hash: "", error: "Destination and amount are required" };
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { hash: "", error: "Amount must be a positive number" };
  }

  if (amountNum < 0.00001) {
    return { hash: "", error: "Minimum amount is 0.00001 XLM" };
  }

  try {
    const account = await server.loadAccount(senderPublicKey);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount: amount,
        })
      )
      .setTimeout(30)
      .build();

    const signedResult = await signTransaction(transaction.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });

    if (signedResult.error) {
      return { hash: "", error: signedResult.error };
    }

    const signedTransaction = TransactionBuilder.fromXDR(
      signedResult.signedTxXdr,
      Networks.TESTNET
    );

    const result = await server.submitTransaction(signedTransaction);

    return { hash: result.hash };
  } catch (e: any) {
    let errorMsg = "Transaction failed";

    if (e?.response?.data?.extras?.result_codes) {
      const codes = e.response.data.extras.result_codes;
      errorMsg = `Transaction failed: ${JSON.stringify(codes)}`;
    } else if (e?.message) {
      errorMsg = e.message;
    }

    return { hash: "", error: errorMsg };
  }
}
