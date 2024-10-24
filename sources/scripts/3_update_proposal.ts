import {
    WalletContractV4,
    beginCell,
    Address,
    contractAddress,
    ContractProvider,
    TonClient4,
    TonClient,
    fromNano,
    toNano,
    Cell,
    BitString,
    Slice,
    internal,
} from "@ton/ton";
import { printSeparator } from "../utils/print";
import * as dotenv from "dotenv";
dotenv.config();

import { mnemonicToPrivateKey } from "ton-crypto";

import { endpoint, STAKINGADDR, workchain } from "./constants";
import { DAO, storeSendUpdateProposal } from "../output/DAO_DAO";
(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client = new TonClient4({
        endpoint: endpoint,
    });
    const mnemonics = process.env.mnemonics?.toString() || "";
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log("deploy wallet", deployer_wallet.address);
    let deployer_wallet_contract = client.open(deployer_wallet);

    let smAddr = Address.parse(STAKINGADDR);
    console.log("Staking Master: " + smAddr);
    let daoInit = await DAO.init(smAddr);
    let daoAddr = contractAddress(workchain, daoInit);
    console.log("DAO:\t" + daoAddr);

    let tm = Math.round(Number(new Date()) / 1000);
    let upMsg = beginCell()
        .store(
            storeSendUpdateProposal({
                $$type: "SendUpdateProposal",
                proposalId: 0n,
                updateParams: {
                    $$type: "Params",
                    proposalStartTime: BigInt(tm + 100),
                    proposalEndTime: BigInt(tm + 1000),
                    title: "proposal - 1",
                    description: "updated test proposal",
                    quorum: 40n,
                },
            })
        )
        .endCell();

    let deployAmount = toNano("0.1");
    let seqno: number = await deployer_wallet_contract.getSeqno();
    let balance: bigint = await deployer_wallet_contract.getBalance();
    console.log("Wallet balance: ", fromNano(balance).toString(), "💎TON");

    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: daoAddr,
                value: deployAmount,
                bounce: true,
                body: upMsg,
            }),
        ],
    });
    console.log("Sending Update proposal message ....");
    printSeparator();
})();
