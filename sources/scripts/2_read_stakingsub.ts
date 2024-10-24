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
} from "@ton/ton";
import { printSeparator } from "../utils/print";
import * as dotenv from "dotenv";
dotenv.config();

// Contract Abi //
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import { mnemonicToPrivateKey } from "ton-crypto";

import { AIJetton } from "../output/DAO_AIJetton";
import { JettonDefaultWallet } from "../output/DAO_JettonDefaultWallet";
import { StakingMasterContract, storeDelegate } from "../output/DAO_StakingMasterContract";

import { endpoint, JETTONADDR, workchain } from "./constants";
(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client = new TonClient4({
        endpoint: endpoint,
    });
    const mnemonics = process.env.mnemonics?.toString() || "";
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let deploy_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log("deploy wallet", deploy_wallet.address);
    let deploy_wallet_contract = client.open(deploy_wallet);

    let jmAddr = Address.parse(JETTONADDR);
    console.log("Jetton Master: " + jmAddr);
    let sminit = await StakingMasterContract.init(deploy_wallet_contract.address, jmAddr);
    let stakingMaster = contractAddress(workchain, sminit);

    let jmContract = await client.open(AIJetton.fromAddress(jmAddr));
    let jetton_wallet = await jmContract.getGetWalletAddress(stakingMaster);

    console.log("Staking Master: " + stakingMaster);
    console.log("Staking's JettonWallet: " + jetton_wallet);

    let scontract_dataFormat = StakingMasterContract.fromAddress(stakingMaster);
    let scontract = client.open(scontract_dataFormat);
    let stakingData = await scontract.getGetStakingData();
    console.log("Staking data: ", stakingData);

    let stakingSub = await scontract.getGetUserStakingAddress(deploy_wallet_contract.address);
    console.log("staking sub:", stakingSub);
    printSeparator();
})();
