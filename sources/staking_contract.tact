import "@stdlib/ownable";
import "@stdlib/deploy";
import "./aijetton.tact";
import "./staking_msg.tact";
import "./vote/messages/proposal-messages.tact";

contract StakingMasterContract with OwnableTransferable {
    aijettonWallet: Address;
    owner: Address;
    index: Int as uint32;
    // content: Cell;
    total_staked: Int as uint128;
    reward_rate: Int as uint32; // 2%
    reward_decimal: Int as uint32;
    reward_period: Int as uint32; // 1 year (365 days)
    freeze_period: Int as uint32; // 3 month

    // TODO:
    // jetton_root_init: InitOf;
    // get fun get_jetton_root(): Address{}
    // InitOf vs Address: Which one has lowest storage cost?

    init(_owner: Address, aijetton: Address){
        self.owner = _owner;
        self.aijettonWallet = aijetton;
        //init params
        self.total_staked = 0;
        self.reward_rate = 200; // 2%
        self.reward_decimal = 10000;
        self.reward_period = (360 * 24) * 3600; // 1 year (365 days)
        self.freeze_period = ((30 * 3) * 24) * 3600; // 3 month
        self.index = 0;
    }

    receive(msg: StakingParams){
        require(sender() == self.owner, "not from owner");
        let init: StateInit = initOf JettonDefaultWallet(myAddress(), msg.jetton_master);
        let wallet_address: Address = contractAddress(init);
        self.aijettonWallet = wallet_address;

        self.reward_rate = msg.reward_rate;
        self.reward_period = msg.reward_period;
        self.freeze_period = msg.freeze_period;
    }

    // The notification for the Jetton Token contract noification(when current address receive the token will get the notification)
    receive(stake: TokenNotification){
        require(context().value >= ton("0.1"), "not enough value");
        // Check the sender is from the Jetton Wallet
        require(sender() == self.aijettonWallet, "not from AIJetton wallet");
        let winit: StateInit = self.getStakingSubInit(stake.from);
        send(SendParameters{
                to: contractAddress(winit),
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: Stake{
                    amount: stake.amount
                }.toCell(),
                code: winit.code,
                data: winit.data
            }
        );
        self.total_staked = self.total_staked + stake.amount;
    }

    receive(msg: SendUnstake){
        require(context().value >= ton("0.1"), "not enough value");
        // Check the sender is from the Jetton Wallet
        let subStakingAddr: Address = self.getUserStakingAddress(sender());
        send(SendParameters{
                to: subStakingAddr,
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: Unstake{
                    index_id: msg.unstakeId,
                    reward_rate: self.reward_rate,
                    freeze_period: self.freeze_period

                }.toCell()
            }
        );
    }

    receive("UnstakeAll"){
        require(context().value >= ton("0.1"), "not enough value");
        // Check the sender is from the Jetton Wallet
        require(sender() == self.aijettonWallet, "not from AIJetton wallet");
        let subStakingAddr: Address = self.getUserStakingAddress(sender());
        send(SendParameters{
                to: subStakingAddr,
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: UnstakeAll{
                    reward_rate: self.reward_rate,
                    freeze_period: self.freeze_period

                }.toCell()
            }
        );
    }

    receive(udata: UnstakeUser){
        // Send Transfer to self.get_major_jetton_address(myAddress())
        // Transfer the jetton token back: Amount, who
        let sinit: StateInit = self.getStakingSubInit(udata.staker_address);
        require(contractAddress(sinit) == sender(), "Invalid sender!");
        let reward: Int = udata.amount * (now() - udata.time) * self.reward_rate / self.reward_decimal / self.reward_period;
        let amount: Int = udata.amount  + reward;
        send(SendParameters{
                to: self.aijettonWallet,
                value: 0,
                mode: SendRemainingValue,
                bounce: true,
                body: TokenTransfer{ // 0x178d4519
                    query_id: 0,
                    amount: amount,
                    destination: udata.staker_address,
                    response_destination: udata.staker_address,
                    forward_ton_amount: 0,
                    custom_payload: beginCell().endCell(),
                    forward_payload: beginCell().endCell().asSlice()
                }.toCell(),
                code: sinit.code,
                data: sinit.data
            }
        );
    }

    receive(msg: FinishVoteStaking){
        require(sender() == self.owner, "only owner can send finish vote");
        send(SendParameters{
                to: msg.dao,
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: SendFinishVote {
                        totalStaked: self.total_staked,
                        proposalId: msg.proposalId
                    }.toCell()
            }
        );
    }

    get fun getStakingData(): StakingData {
        return
            StakingData{
                index: self.index,
                aijettonWallet: self.aijettonWallet,
                total_staked: self.total_staked,
                reward_rate: self.reward_rate,
                reward_period: self.reward_period,
                freeze_period: self.freeze_period

            };
    }

    get fun getStakingRatio(): Int {
        return self.reward_rate;
    }

    get fun getStakingSubInit(address: Address): StateInit {
        return initOf StakingSubContract(address, myAddress());
    }

    get fun getUserStakingAddress(owner: Address): Address {
        return contractAddress(initOf StakingSubContract(owner, myAddress()));
    }
}

contract StakingSubContract with Deployable{
    owner: Address;
    master: Address;
    index: Int as uint32 = 0;
    stake_record: map<Int, StakeRecord>;
    total_staked: Int as uint128 = 0;
    staked: Int as uint128 = 0;
    total_unstaked: Int as uint128 = 0;
    unstaked_index: Int as uint32 = 0;
    delegate_to: map<Address, Int>;
    delegate_from: map<Address, Int>;
    delegate_total: Int as uint128 = 0;
    delegate_from_total: Int as uint128 = 0;
    // TODO:
    // jetton_root_init: InitOf;
    // get fun get_jetton_root(): Address{}
    // InitOf vs Address: Which one has lowest storage cost?

    init(_owner: Address, _master: Address){
        // self.this_contract_jettonWallet = this_contract_jettonWallet;
        self.owner = _owner;
        self.master = _master;
    }

    // The notification for the Jetton Token contract noification(when current address receive the token will get the notification)
    receive(stake: Stake){
        require(context().value >= ton("0.1"), "not enough value");
        require(sender() == self.master, "not from master");
        // Update the stake record
        self.stake_record.set(self.index, StakeRecord{amount: stake.amount, time: now(), isunstaked: false});
        self.total_staked = self.total_staked + stake.amount;
        self.index = self.index + 1;
    }

    receive(udata: Unstake){
        require(sender() == self.master, "not master");
        self.unstake_internal(udata.index_id, udata.reward_rate, udata.freeze_period);
    }

    receive(udata: UnstakeAll){
        require(sender() == self.master, "not master");
        let i: Int = self.unstaked_index;
        while(i < self.index){
            let sr: StakeRecord? = self.stake_record.get(i);
            if(sr != null) {
                let record: StakeRecord = self.stake_record.get(i)!!;
                if( (udata.freeze_period + record.time) > now()) {
                    i = self.index;
                } else {
                    self.unstake_internal(i, udata.reward_rate, udata.freeze_period);
                    i += 1;
                }
            } else {
                i = self.index;
            }
        }
    }

    fun unstake_internal(index: Int, reward_rate: Int, freeze_period: Int) {
        let stake_record: StakeRecord = self.stake_record.get(index)!!;
        require(stake_record.isunstaked != null, "no record");
        require(stake_record.isunstaked == false, "don't have value");
        require(stake_record.amount > 0, "don't have value");
        require((freeze_period + stake_record.time) < now(), "time invalid");
        self.total_staked = self.total_staked - stake_record.amount;

        send(SendParameters{
                to: self.master,
                value: 0,
                mode: SendRemainingValue + SendIgnoreErrors,
                bounce: false, // 0x7362d09c - notify new owner
                body: UnstakeUser{
                    query_id: 0,
                    staker_address: self.owner,
                    amount: stake_record.amount,
                    time: stake_record.time
                }.toCell()
            }
        );

        self.unstaked_index = index;
        self.stake_record.set(index, null);
        if(self.total_staked < self.delegate_total){
            self.delegate_total = 0;
        }
    }

    receive(msg: Delegate){
        require(sender() == self.owner, "Not owner");
        self.delegateInternal(msg.to, msg.amount, false);
    }

    fun delegateInternal(to: Address, amount: Int, flag: Bool) {
        let amt: Int? =  self.delegate_to.get(to);
        let newAmount: Int = 0;
        if(amt != null) {
            newAmount = self.delegate_to.get(to)!!;
        }
        if(flag == false) {
            require(self.delegate_total + amount <= self.total_staked, "Exceed total staked amount");
            self.delegate_total = self.delegate_total + amount;
            newAmount = newAmount + amount;
        } else {
            require(newAmount >= amount, "Invalid unstaking amount");
            self.delegate_total = self.delegate_total - amount;
            newAmount = newAmount - amount;
        }
        self.delegate_to.set(to, newAmount);

        let winit: StateInit = self.getStakingSubInit(to); // Create message
        send(SendParameters{
                to: contractAddress(winit),
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: DelegateTo{
                    amount: amount,
                    from: self.owner,
                    flag: flag
                }.toCell(),
                code: winit.code,
                data: winit.data
            }
        );
    }

    receive(msg: DelegateTo){
        let fAddr: Address = contractAddress(self.getStakingSubInit(msg.from)); // Create message
        require(fAddr == sender(), "Invalid sender");
        let amt: Int? = self.delegate_from.get(msg.from);
        let amount: Int = 0;
        if(amt != null) {
            amount = self.delegate_from.get(msg.from)!!;
        }
        if(msg.flag == false) {
            self.delegate_from_total = self.delegate_from_total + msg.amount;
            amount = amount + msg.amount;
        } else {
            require(amount >= msg.amount, "Invalid amount1");
            require(self.delegate_from_total >= msg.amount, "Invalid amount2");
            self.delegate_from_total = self.delegate_from_total - msg.amount;
            amount = amount - msg.amount;
        }
        self.delegate_from.set(msg.from, amount);
    }

    receive(msg: UserVote){
        require(sender() == self.owner, "Not owner");
        let amount: Int = self.total_staked + self.delegate_from_total - self.delegate_total;
        require(amount > 0, "Invalid voting power");
        let proposal: StateInit =  initOf Proposal(msg.dao, self.master, msg.id);
        send(SendParameters{
                to: contractAddress(proposal),
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: Vote{
                    voter: self.owner,
                    amount: amount,
                    isYes: msg.isYes
                }.toCell(),
                code: proposal.code,
                data: proposal.data
            }
        );
    }

    get fun getStakingSubInit(address: Address): StateInit {
        return initOf StakingSubContract(address, self.master);
    }

    get fun get_user_stake_record(): map<Int, StakeRecord> {
        return self.stake_record;
    }

    get fun get_user_delegateto_record(): map<Address, Int> {
        return self.delegate_to;
    }

    get fun get_user_delegatefrom_record(): map<Address, Int> {
        return self.delegate_from;
    }

    get fun get_user_staking_data(): UserStakingData {
        return
            UserStakingData{
                owner: self.owner,
                total_staked: self.total_staked,
                index: self.index,
                total_unstaked: self.total_unstaked
            };
    }
}

contract Proposal with Deployable {
    dao: Address;
    stakingMaster: Address;
    id: Int as uint32;
    proposalStartTime: Int as uint64;
    proposalEndTime: Int as uint64;
    title: String;
    description: String;
    quorum: Int as uint32;
    voteYes: Int as uint64;
    voteNo: Int as uint64;
    voted: map<Address, Bool>;
    totalStaked: Int as uint64;
    //0 : No, 1: True, 2: Not meet quorem, 3: Not finished
    votingStatus: Int as uint8;

    init(dao: Address, master: Address, id: Int){
        self.dao = dao;
        self.id = id;
        self.proposalStartTime = 0;
        self.proposalEndTime = 0;
        self.title = "";
        self.description = "";
        self.quorum = 70;
        self.voteYes = 0;
        self.voteNo = 0;
        self.votingStatus = 3;
        self.stakingMaster = master;
        self.totalStaked = 0;
    }

    receive(msg: ProposalInit){
        require(self.proposalStartTime == 0 && self.proposalEndTime == 0,
            "Already initialized"
        );
        require(sender() == self.dao, "Invalid sender");
        self.proposalStartTime = msg.body.proposalStartTime;
        self.proposalEndTime = msg.body.proposalEndTime;
        self.title = msg.body.title;
        self.description = msg.body.description;
        self.quorum = msg.body.quorum;
    }

    receive(vote: Vote){
        require(now() >= self.proposalStartTime && now() <= self.proposalEndTime, "Inactive proposal");
        let staking_sub: Address = contractAddress(initOf StakingSubContract(vote.voter, self.stakingMaster));
        require(sender() == staking_sub, "Not from voter");
        require(vote.amount > 0, "Invalid voting amount");
        require(self.voted.get(vote.voter) != true, "Already voted");
        if (vote.isYes) {
            self.voteYes = self.voteYes + vote.amount;
        } else {
            self.voteNo = self.voteNo + vote.amount;
        }
        self.voted.set(vote.voter, true);
    }

    receive(msg: UpdateProposal){
        require(self.proposalStartTime != 0 && self.proposalEndTime != 0,
            "Propsal was not initialized yet"
        );
        require(sender() == self.dao, "Invalid sender");
        require(now() <= self.proposalStartTime, "Update proposal is possible only before start time");
        self.proposalStartTime = msg.updateParams.proposalStartTime;
        self.proposalEndTime = msg.updateParams.proposalEndTime;
        self.title = msg.updateParams.title;
        self.description = msg.updateParams.description;
        self.quorum = msg.updateParams.quorum;
    }

    get fun state(): ProposalContractState {
        return
            ProposalContractState{
                dao: self.dao,
                id: self.id,
                proposalStartTime: self.proposalStartTime,
                proposalEndTime: self.proposalEndTime,
                title: self.title,
                description: self.description,
                quorum: self.quorum,
                result: self.votingStatus,
                voteYes: self.voteYes,
                voteNo: self.voteNo
            };
    }

    receive(finish: FinishVote){
        require(self.proposalEndTime < now(), "Not finished");
        require(sender() == self.dao, "Invalid sender");
        self.totalStaked = finish.totalStaked;
        let totalVoted: Int = self.voteYes + self.voteNo;
        if (((self.totalStaked * self.quorum) / 100) > totalVoted) {
            self.votingStatus = 2;
        } else if (self.voteYes > self.voteNo) {
            self.votingStatus = 1;
        } else {
            self.votingStatus = 0;
        }
    }
}