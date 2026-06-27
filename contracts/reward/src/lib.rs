#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

mod poll_import {
    use soroban_sdk::String as SorobanString;
    soroban_sdk::contractimport!(file = "../poll/target/wasm32v1-none/release/stellar_poll.wasm");
}

use poll_import::Client;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardInfo {
    pub total_earned: u32,
    pub vote_count: u32,
}

#[contracttype]
pub enum DataKey {
    Reward(Address),
    TotalDistributed,
}

#[contract]
pub struct RewardContract;

#[contractimpl]
impl RewardContract {
    pub fn initialize(env: Env) {
        if env.storage().instance().has(&DataKey::TotalDistributed) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &0u32);
    }

    pub fn claim_reward(env: Env, voter: Address, poll_address: Address) {
        voter.require_auth();

        let poll_client = Client::new(&env, &poll_address);
        let has_voted = poll_client.has_voted(&voter);

        if !has_voted {
            panic!("voter has not voted in the referenced poll");
        }

        let mut reward: RewardInfo = env
            .storage()
            .instance()
            .get(&DataKey::Reward(voter.clone()))
            .unwrap_or(RewardInfo {
                total_earned: 0,
                vote_count: 0,
            });

        reward.total_earned += 10;
        reward.vote_count += 1;

        env.storage()
            .instance()
            .set(&DataKey::Reward(voter.clone()), &reward);

        let mut total: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        total += 10;
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &total);
    }

    pub fn get_reward(env: Env, voter: Address) -> RewardInfo {
        env.storage()
            .instance()
            .get(&DataKey::Reward(voter))
            .unwrap_or(RewardInfo {
                total_earned: 0,
                vote_count: 0,
            })
    }

    pub fn get_total_distributed(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo, Register},
        vec, Address, Env, String,
    };

    fn deploy_poll(env: &Env) -> (Address, crate::poll_import::Client<'_>) {
        let owner = Address::generate(env);
        #[allow(deprecated)]
        let poll_id = env.register_contract_wasm(None::<&Address>, crate::poll_import::WASM);
        let poll_client = crate::poll_import::Client::new(env, &poll_id);

        let question = String::from_str(env, "Best blockchain?");
        let options = vec![
            env,
            String::from_str(env, "Stellar"),
            String::from_str(env, "Ethereum"),
        ];
        poll_client.initialize(&owner, &question, &options, &5000);

        (poll_id, poll_client)
    }

    fn deploy_reward(env: &Env) -> (Address, crate::RewardContractClient<'_>) {
        let reward_id = crate::RewardContract.register(env, None, ());
        let reward_client = crate::RewardContractClient::new(env, &reward_id);
        reward_client.initialize();
        (reward_id, reward_client)
    }

    #[test]
    fn test_claim_reward_after_vote() {
        let env = Env::default();
        env.mock_all_auths();

        Ledger::set(&env.ledger(), LedgerInfo {
            timestamp: 1000,
            protocol_version: 27,
            sequence_number: 0,
            network_id: [0; 32],
            base_reserve: 10,
            min_persistent_entry_ttl: 4096,
            min_temp_entry_ttl: 16,
            max_entry_ttl: 6312000,
        });

        let (poll_id, poll_client) = deploy_poll(&env);
        let voter = Address::generate(&env);

        poll_client.vote(&voter, &0);

        let (_, reward_client) = deploy_reward(&env);
        reward_client.claim_reward(&voter, &poll_id);

        let reward = reward_client.get_reward(&voter);
        assert_eq!(reward.total_earned, 10);
        assert_eq!(reward.vote_count, 1);
    }

    #[test]
    #[should_panic(expected = "voter has not voted")]
    fn test_claim_without_vote_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        Ledger::set(&env.ledger(), LedgerInfo {
            timestamp: 1000,
            protocol_version: 27,
            sequence_number: 0,
            network_id: [0; 32],
            base_reserve: 10,
            min_persistent_entry_ttl: 4096,
            min_temp_entry_ttl: 16,
            max_entry_ttl: 6312000,
        });

        let (poll_id, _) = deploy_poll(&env);
        let voter = Address::generate(&env);

        let (_, reward_client) = deploy_reward(&env);
        reward_client.claim_reward(&voter, &poll_id);
    }

    #[test]
    fn test_multiple_claims_accumulate() {
        let env = Env::default();
        env.mock_all_auths();

        Ledger::set(&env.ledger(), LedgerInfo {
            timestamp: 1000,
            protocol_version: 27,
            sequence_number: 0,
            network_id: [0; 32],
            base_reserve: 10,
            min_persistent_entry_ttl: 4096,
            min_temp_entry_ttl: 16,
            max_entry_ttl: 6312000,
        });

        let (poll_id, poll_client) = deploy_poll(&env);
        let voter_a = Address::generate(&env);
        let voter_b = Address::generate(&env);

        poll_client.vote(&voter_a, &0);
        poll_client.vote(&voter_b, &1);

        let (_, reward_client) = deploy_reward(&env);
        reward_client.claim_reward(&voter_a, &poll_id);
        reward_client.claim_reward(&voter_b, &poll_id);

        assert_eq!(reward_client.get_reward(&voter_a).total_earned, 10);
        assert_eq!(reward_client.get_reward(&voter_b).total_earned, 10);
        assert_eq!(reward_client.get_total_distributed(), 20);
    }
}
