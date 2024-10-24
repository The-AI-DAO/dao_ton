import { WalletContractV4, Address, contractAddress, TonClient4 } from "@ton/ton";
import { printSeparator } from "../utils/print";
import * as dotenv from "dotenv";
dotenv.config();

// Contract Abi //
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import { mnemonicToPrivateKey } from "ton-crypto";

import { AIJetton } from "../output/DAO_AIJetton";
import { StakingMasterContract } from "../output/DAO_StakingMasterContract";
import { StakingSubContract } from "../output/DAO_StakingSubContract";
import { endpoint, JETTONADDR, jettonParams, workchain } from "./constants";
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
    let deploy_wallet_contract = client.open(deploy_wallet);
    // Create content Cell
    let content = buildOnchainMetadata(jettonParams);

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

    printSeparator();
    let stakingSub = await scontract.getGetUserStakingAddress(deploy_wallet_contract.address);
    console.log("Deployer's staking sub:", stakingSub);

    let ssubFormat = StakingSubContract.fromAddress(stakingSub);
    let ssubContract = client.open(ssubFormat);

    let ssubdata = await ssubContract.getGetUserStakingData();
    console.log("Staking sub info", ssubdata);

    let ssrec = await ssubContract.getGetUserStakeRecord();
    console.log("Staking sub record", ssrec);

    let ssdel = await ssubContract.getGetUserDelegatetoRecord();
    console.log("Staking sub delegate record", ssdel);

    return;
    let stakingSub1 = await scontract.getGetUserStakingAddress(
        Address.parse("UQBhKMO1WIHlKQQ5YRvq7wrjJaUPRp8LVYtqJSmjgjnnsXiC")
    );

    let ssubFormat1 = StakingSubContract.fromAddress(stakingSub1);
    let ssubContract1 = client.open(ssubFormat1);

    let ssdel1 = await ssubContract1.getGetUserDelegatefromRecord();
    console.log("\nStaking sub delegate from record", ssdel1);
    // loadOwnershipAssigned => msg.forwardload
    // TODO: let aa = loadMint(src.asSlice());
    // console.log("Mint MemberID: " + aa.item_index + ", by " + aa.minter);
})();
