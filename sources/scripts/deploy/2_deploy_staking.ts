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
import { StakingMasterContract, storeStakingParams } from "../../output/DAO_StakingMasterContract";

import { printSeparator } from "../../utils/print";

import { endpoint, JETTONADDR, workchain } from "../constants";
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

    let jettonMaster = Address.parse(JETTONADDR);

    let sminit = await StakingMasterContract.init(deployer_wallet_contract.address, jettonMaster);
    let stakingMaster = contractAddress(workchain, sminit);

    let value = toNano("0.1");

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("======= Staking Master Contract Deployment =======");
    console.log("Deployment wallet: " + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();
    console.log("Wallet balance: ", fromNano(balance).toString(), "💎TON");

    printSeparator();

    let packed_msg = beginCell()
        .store(
            storeStakingParams({
                $$type: "StakingParams",
                jetton_master: jettonMaster,
                reward_rate: 200n,
                reward_period: BigInt(365 * 24 * 3600),
                freeze_period: BigInt(3 * 30 * 24 * 3600),
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
                value: value,
                init: {
                    code: sminit.code,
                    data: sminit.data,
                },
                bounce: true,
                body: packed_msg,
            }),
        ],
    });
    console.log("Staking Master Address: " + stakingMaster);
    console.log("Deploy Staking Master contract....");
    printSeparator();
})();
