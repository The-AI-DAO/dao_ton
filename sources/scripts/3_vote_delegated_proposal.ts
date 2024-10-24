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
import { mnemonicToPrivateKey } from "ton-crypto";

import { StakingMasterContract, storeUserVote } from "../output/DAO_StakingMasterContract";
import { endpoint, STAKINGADDR, workchain } from "./constants";
import { DAO } from "../output/DAO_DAO";
(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client = new TonClient4({
        endpoint: endpoint,
    });
    const mnemonics = process.env.mnemonics2?.toString() || "";
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let delegated_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log("Delegated wallet:", delegated_wallet.address);
    let delegated_wallet_contract = client.open(delegated_wallet);

    let smAddr = Address.parse(STAKINGADDR);
    console.log("Staking Master: " + smAddr);
    let daoInit = await DAO.init(smAddr);
    let daoAddr = contractAddress(workchain, daoInit);
    console.log("DAO:\t" + daoAddr);

    let scontract_dataFormat = StakingMasterContract.fromAddress(smAddr);
    let smContract = client.open(scontract_dataFormat);
    let stakingSub = await smContract.getGetUserStakingAddress(delegated_wallet_contract.address);
    console.log("Staking sub:", stakingSub);

    let dao_format = DAO.fromAddress(daoAddr);
    let daoContract = client.open(dao_format);
    let lastProposalAddr = await daoContract.getProposalAddr(0n);
    console.log("Last proposal Addr:", lastProposalAddr.toString());

    let voteMsg = beginCell()
        .store(
            storeUserVote({
                $$type: "UserVote",
                dao: daoAddr,
                id: 0n,
                isYes: false,
            })
        )
        .endCell();

    let deployAmount = toNano("0.1");
    let seqno: number = await delegated_wallet_contract.getSeqno();
    let balance: bigint = await delegated_wallet_contract.getBalance();
    console.log("Wallet balance:", fromNano(balance).toString(), "💎TON");

    await delegated_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: stakingSub,
                value: deployAmount,
                bounce: true,
                body: voteMsg,
            }),
        ],
    });

    console.log("Vote from delegated account...");
    printSeparator();
})();
