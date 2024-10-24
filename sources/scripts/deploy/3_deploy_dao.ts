import {
    beginCell,
    contractAddress,
    toNano,
    TonClient4,
    WalletContractV4,
    internal,
    fromNano,
    Address,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { DAO } from "../../output/DAO_DAO";

import { printSeparator } from "../../utils/print";

import { endpoint, STAKINGADDR, workchain } from "../constants";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client4 = new TonClient4({
        endpoint: endpoint,
    });

    let mnemonics = (process.env.mnemonics || "").toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    let deployer_wallet_contract = client4.open(deployer_wallet);

    let stakingMaster = Address.parse(STAKINGADDR);
    let deployAmount = toNano("0.1");

    let daoInit = await DAO.init(stakingMaster);
    let daoAddr = contractAddress(workchain, daoInit);

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("======= DAO Contract Deployment =======");
    console.log("Deployment wallet: " + deployer_wallet_contract.address);
    console.log("Seqno:", seqno);
    let balance: bigint = await deployer_wallet_contract.getBalance();
    console.log("Wallet balance:", fromNano(balance).toString(), "💎TON");
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: daoAddr,
                value: deployAmount,
                init: {
                    code: daoInit.code,
                    data: daoInit.data,
                },
            }),
        ],
    });
    console.log("======= DAO Deployment message sent to =======\n", daoAddr);
    printSeparator();
})();
