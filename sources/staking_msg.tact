// ===== Data Struct ===== //
struct StakingData {
    index: Int as uint64;
    aijettonWallet: Address;
    total_staked: Int as coins;
    reward_rate: Int as uint32;
    reward_period: Int as uint32;
    freeze_period: Int as uint32;
}
struct UserStakingData {
    owner: Address;
    total_staked: Int as uint64;
    index: Int as uint64;
    total_unstaked: Int as uint64;
}
struct StakeRecord {
    amount: Int as coins;
    time: Int as uint32;
    isunstaked: Bool;
}
// ===== LOG Event ===== //
message TransferEvent {
    sender_address: Address;
    jetton_amount: Int as coins;
    score: Int as uint128;
}
// ================================================================================ //
message AddingJettonAddress {
    aijettonWallet: Address;
}
message Stake {
    amount: Int as coins;
}
message SendUnstake {
    unstakeId: Int as uint32;
}
message Unstake {
    index_id: Int as uint32;
    reward_rate: Int as uint32;
    freeze_period: Int as uint32;
}
message UnstakeAll {
    reward_rate: Int as uint32;
    freeze_period: Int as uint32;
}
message UnstakeUser {
    query_id: Int as uint64;
    staker_address: Address;
    amount: Int as uint128;
    time: Int as uint32;
}
message Redeem {
    queryId: Int as uint64;
    project_id: Int as uint16;
}
message UserStakeData {
    staker_address: Address;
    staked_amount: Int as uint128;
    unstaked_amount: Int as uint128;
    cliamed_reward: Int as uint128;
    index: Int as uint32;
    unstaked_index: Int as uint32;
}
message UserVote {
    dao: Address;
    id: Int as uint32;
    isYes: Bool;
}
message Delegate {
    to: Address;
    amount: Int as uint64;
}
message DelegateTo {
    from: Address;
    amount: Int as uint64;
    flag: Bool;
}
message StakingParams {
    jetton_master: Address;
    reward_rate: Int as uint32;
    reward_period: Int as uint32;
    freeze_period: Int as uint32;
}