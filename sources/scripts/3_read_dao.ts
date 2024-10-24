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
import { StakingMasterContract } from "../output/DAO_StakingMasterContract";
import { StakingSubContract } from "../output/DAO_StakingSubContract";
import { endpoint, jettonParams, max_supply, STAKINGADDR, workchain } from "./constants";
import { DAO } from "../output/DAO_DAO";
import { Proposal } from "../output/DAO_Proposal";
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

    let dao_format = DAO.fromAddress(daoAddr);
    let daoContract = client.open(dao_format);
    let proposalId = await daoContract.getNextProposalId();

    console.log("Current proposal Id:", proposalId);

    let lastProposalAddr = await daoContract.getProposalAddr(0n);
    console.log("Last proposal Addr:", lastProposalAddr.toString());

    let propData = Proposal.fromAddress(lastProposalAddr);
    let proposalContract = client.open(propData);

    let propInfo = await proposalContract.getState();
    console.log("======Proposal State======\m", propInfo);
})();
