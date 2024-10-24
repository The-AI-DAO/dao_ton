// ---------------------------------------
// Proposal
// ---------------------------------------
struct Params {
    proposalStartTime: Int as uint64;
    proposalEndTime: Int as uint64;
    title: String;
    description: String;
    quorum: Int as uint8;
}
message ProposalInit {
    body: Params;
}
message(0x7c420ea2) Vote {
    voter: Address;
    amount: Int as uint64;
    isYes: Bool;
}
message UpdateProposal {
    updateParams: Params;
}
struct ProposalContractState {
    dao: Address;
    id: Int as uint32;
    proposalStartTime: Int as uint64;
    proposalEndTime: Int as uint64;
    title: String;
    description: String;
    quorum: Int as uint32;
    result: Int as uint8;
    voteYes: Int as uint64;
    voteNo: Int as uint64;
}
message(0x7c420ffe) FinishVote {
    totalStaked: Int as uint64;
}

message FinishVoteStaking {
    dao: Address;
    proposalId: Int as uint32;
}

message SendFinishVote {
    totalStaked: Int as uint64;
    proposalId: Int as uint32;
}