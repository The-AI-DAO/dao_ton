import "@stdlib/deploy";
import "@stdlib/ownable";
import "./messages/dao-messages";
import "../staking_contract";

contract DAO with Ownable {
    owner: Address; // dao is parent contract (cannot be changed)
    nextProposalId: Int as uint32;
    stakingmaster: Address;
    init(stakingmaster: Address){
        self.owner = sender();
        self.nextProposalId = 0;
        self.stakingmaster = stakingmaster;
    }

    receive(msg: DeployAndInitProposal){
        require(sender() == self.owner, "only dao can send create proposal message");
        // Create message
        let init: StateInit = self.getProposalStateInit(self.nextProposalId);
        let proposalAddress: Address = contractAddress(init);
        send(SendParameters{
                to: proposalAddress,
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: ProposalInit{body: msg.body}.toCell(),
                code: init.code,
                data: init.data
            }
        );
        self.nextProposalId = self.nextProposalId + 1;
    }

    receive(msg: SendUpdateProposal){
        require(sender() == self.owner, "only owner can send update proposal message");
        let proposalAddress: Address = self.proposalAddr(msg.proposalId);
        send(SendParameters{
                to: proposalAddress,
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: UpdateProposal{updateParams: msg.updateParams}.toCell()
            }
        );
    }

    receive(msg: SendFinishVote){
        require(sender() == self.stakingmaster, "only owner can send update proposal message");
        let proposalAddress: Address = self.proposalAddr(msg.proposalId);
        send(SendParameters{
                to: proposalAddress,
                value: 0,
                bounce: true,
                mode: SendRemainingValue,
                body: FinishVote{totalStaked: msg.totalStaked}.toCell()
            }
        );
    }

    fun getProposalStateInit(index: Int): StateInit {
        return initOf Proposal(myAddress(), self.stakingmaster, index);
    }

    get fun nextProposalId(): Int {
        return self.nextProposalId;
    }

    get fun proposalAddr(index: Int): Address {
        let init: StateInit = self.getProposalStateInit(index);
        return contractAddress(init);
    }
}