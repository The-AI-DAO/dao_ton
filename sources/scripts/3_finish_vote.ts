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

// Contract Abi //
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import { mnemonicToPrivateKey } from "ton-crypto";

import { AIJetton, storeUserVote } from "../output/DAO_AIJetton";
import { JettonDefaultWallet } from "../output/DAO_JettonDefaultWallet";
import { StakingMasterContract, storeFinishVoteStaking } from "../output/DAO_StakingMasterContract";
import { endpoint, jettonParams, max_supply, STAKINGADDR, workchain } from "./constants";
import { DAO } from "../output/DAO_DAO";
(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client = new TonClient4({
        endpoint: endpoint,
    });
    const mnemonics = process.env.mnemonics?.toString() || "";
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log("Deployer wallet:", deployer_wallet.address);
    let deployer_wallet_contract = client.open(deployer_wallet);

    let smAddr = Address.parse(STAKINGADDR);
    console.log("Staking Master: " + smAddr);
    let daoInit = await DAO.init(smAddr);
    let daoAddr = contractAddress(workchain, daoInit);
    console.log("DAO:\t" + daoAddr);

    let dao_format = DAO.fromAddress(daoAddr);
    let daoContract = client.open(dao_format);
    let lastProposalAddr = await daoContract.getProposalAddr(0n);
    console.log("Last proposal Addr:", lastProposalAddr.toString());

    let finishVoteMsge = beginCell()
        .store(
            storeFinishVoteStaking({
                $$type: "FinishVoteStaking",
                dao: daoAddr,
                proposalId: 0n,
            })
        )
        .endCell();

    let deployAmount = toNano("0.1");
    let seqno: number = await deployer_wallet_contract.getSeqno();
    printSeparator();

    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: smAddr,
                value: deployAmount,
                bounce: true,
                body: finishVoteMsge,
            }),
        ],
    });
    console.log("Finish vote message is sent.")
})();
