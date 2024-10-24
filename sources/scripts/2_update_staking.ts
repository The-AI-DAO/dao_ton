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
import { StakingMasterContract, storeStakingParams } from "../output/DAO_StakingMasterContract";

import { printSeparator } from "../utils/print";

import { endpoint, JETTONADDR, workchain } from "./constants";
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
    console.log(deployer_wallet.address);

    let deployer_wallet_contract = client4.open(deployer_wallet);

    let jettonMaster = Address.parse(JETTONADDR);

    let sminit = await StakingMasterContract.init(deployer_wallet_contract.address, jettonMaster);
    let stakingMaster = contractAddress(workchain, sminit);

    let deployAmount = toNano("0.1");

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("Deployer wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();
    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON");

    printSeparator();

    let packed_msg = beginCell()
        .store(
            storeStakingParams({
                $$type: "StakingParams",
                jetton_master: jettonMaster,
                reward_rate: 10000n,
                reward_period: BigInt(3600),
                freeze_period: BigInt(100),
            })
        )
        .endCell();
    // console.log("sm init", sminit.code.toString());
    // console.log("sm init", sminit.code);
    // return;
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: stakingMaster,
                value: deployAmount,
                bounce: true,
                body: packed_msg,
            }),
        ],
    });
    console.log("====== Update Staking message sent to =======\n", stakingMaster);
})();
