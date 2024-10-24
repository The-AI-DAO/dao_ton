import {
    WalletContractV4,
    beginCell,
    Address,
    contractAddress,
    TonClient4,
    fromNano,
    toNano,
    internal,
} from "@ton/ton";
import { printSeparator } from "../utils/print";
import * as dotenv from "dotenv";
dotenv.config();

import { mnemonicToPrivateKey } from "ton-crypto";

import { endpoint, STAKINGADDR, workchain } from "./constants";
import { DAO, storeDeployAndInitProposal } from "../output/DAO_DAO";
(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client = new TonClient4({
        endpoint: endpoint,
    });
    const mnemonics = process.env.mnemonics?.toString() || "";
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log("====== New Propposal Contract Deployment =======\n");
    console.log("Deployer wallet", deployer_wallet.address);
    let deployer_wallet_contract = client.open(deployer_wallet);

    let smAddr = Address.parse(STAKINGADDR);
    console.log("Staking Master: " + smAddr);
    let daoInit = await DAO.init(smAddr);
    let daoAddr = contractAddress(workchain, daoInit);
    console.log("DAO:\t" + daoAddr);

    let tm = Math.round(Number(new Date()) / 1000);
    console.log(tm);
    let initProposal = beginCell()
        .store(
            storeDeployAndInitProposal({
                $$type: "DeployAndInitProposal",
                body: {
                    $$type: "Params",
                    proposalStartTime: BigInt(tm + 100),
                    proposalEndTime: BigInt(tm + 1000),
                    title: "Proposal 1",
                    description: "Proposal 1",
                    quorum: 70n,
                },
            })
        )
        .endCell();

    let deployAmount = toNano("0.15");
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
                body: initProposal,
            }),
        ],
    });
    console.log("Deploying new proposal....");
    printSeparator();
})();
