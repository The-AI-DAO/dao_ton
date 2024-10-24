import { WalletContractV4, beginCell, Address, TonClient4, toNano, internal } from "@ton/ton";
import { printSeparator } from "../utils/print";
import * as dotenv from "dotenv";
dotenv.config();

// Contract Abi //
import { mnemonicToPrivateKey } from "ton-crypto";

import { StakingMasterContract } from "../output/DAO_StakingMasterContract";
import { StakingSubContract, storeDelegate } from "../output/DAO_StakingSubContract";

import { endpoint, STAKINGADDR, workchain } from "./constants";
(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client = new TonClient4({
        endpoint: endpoint,
    });
    const mnemonics = process.env.mnemonics?.toString() || "";
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let deploy_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log("Deployer wallet", deploy_wallet.address);
    let deployer_wallet_contract = client.open(deploy_wallet);
    let seqno: number = await deployer_wallet_contract.getSeqno();
    // Create content Cell
    let stakingMaster = Address.parse(STAKINGADDR);
    console.log("Staking Master: " + stakingMaster);
    let scontract_dataFormat = StakingMasterContract.fromAddress(stakingMaster);
    let scontract = client.open(scontract_dataFormat);
    let stakingSub = await scontract.getGetUserStakingAddress(deployer_wallet_contract.address);
    console.log("staking sub:", stakingSub);

    let ssubFormat = StakingSubContract.fromAddress(stakingSub);
    let ssubContract = client.open(ssubFormat);

    const mnemonics2 = process.env.mnemonics2?.toString() || "";
    let keyPair3 = await mnemonicToPrivateKey(mnemonics2.split(" "));
    let secretKey3 = keyPair3.secretKey;
    let delegated_wallet = WalletContractV4.create({ workchain, publicKey: keyPair3.publicKey });
    console.log("Delegate receving wallet:", delegated_wallet.address);

    let packed_msg = beginCell()
        .store(
            storeDelegate({
                $$type: "Delegate",
                to: delegated_wallet.address,
                amount: toNano("3333"),
            })
        )
        .endCell();
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: stakingSub,
                value: toNano("0.15"),
                bounce: true,
                body: packed_msg,
            }),
        ],
    });
    console.log("====== Delegate message sent to =======\n", stakingSub);
})();
