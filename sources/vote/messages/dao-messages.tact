import "./proposal-messages";
// ---------------------------------------
// ProposalDeployer
// ---------------------------------------
message DeployAndInitProposal {
    body: Params;
}

message SendProposalInit {
    body: Params;
}

message SendUpdateProposal {
    proposalId: Int as uint32;
    updateParams: Params;
}
