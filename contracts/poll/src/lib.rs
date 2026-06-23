#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, vec, Env, Vec, Address, String as SorobanString,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollInfo {
    pub question: SorobanString,
    pub options: Vec<SorobanString>,
    pub deadline: u64,
    pub owner: Address,
    pub total_votes: u32,
}

#[contracttype]
pub enum DataKey {
    Poll,
    Voter(Address),
    Results(u32),
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    pub fn initialize(
        env: Env,
        owner: Address,
        question: SorobanString,
        options: Vec<SorobanString>,
        deadline: u64,
    ) {
        assert!(!options.is_empty(), "need at least 1 option");
        assert!(deadline > env.ledger().timestamp(), "deadline in past");

        let poll = PollInfo {
            question,
            options,
            deadline,
            owner,
            total_votes: 0,
        };
        env.storage().instance().set(&DataKey::Poll, &poll);
    }

    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        let poll: PollInfo = env
            .storage()
            .instance()
            .get(&DataKey::Poll)
            .expect("not initialized");

        assert!(
            env.ledger().timestamp() < poll.deadline,
            "voting has ended"
        );
        assert!(option_index < (poll.options.len() as u32), "invalid option");

        assert!(
            env.storage()
                .instance()
                .get::<_, bool>(&DataKey::Voter(voter.clone()))
                .is_none(),
            "already voted"
        );

        env.storage()
            .instance()
            .set(&DataKey::Voter(voter.clone()), &true);

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Results(option_index))
            .unwrap_or(0);
        count += 1;
        env.storage()
            .instance()
            .set(&DataKey::Results(option_index), &count);

        let mut updated = poll.clone();
        updated.total_votes += 1;
        env.storage().instance().set(&DataKey::Poll, &updated);

        env.events().publish(
            ("poll", "voted"),
            (voter, option_index, env.ledger().timestamp()),
        );
    }

    pub fn get_poll(env: Env) -> PollInfo {
        env.storage()
            .instance()
            .get(&DataKey::Poll)
            .expect("not initialized")
    }

    pub fn get_results(env: Env, option_count: u32) -> Vec<u32> {
        let mut results = vec![&env];
        for i in 0..option_count {
            let count: u32 = env
                .storage()
                .instance()
                .get(&DataKey::Results(i))
                .unwrap_or(0);
            results.push_back(count);
        }
        results
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::Voter(voter))
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo, Register},
        vec, Env, Address, String,
    };
    use crate::PollContract;

    fn setup() -> (Env, Address, crate::PollContractClient<'static>) {
        let env = Env::default();
        let owner = Address::generate(&env);
        let contract_id = PollContract.register(&env, None, ());
        let client = crate::PollContractClient::new(&env, &contract_id);

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

        env.mock_all_auths();

        (env, owner, client)
    }

    #[test]
    fn test_initialize_poll() {
        let (env, owner, client) = setup();

        let question = String::from_str(&env, "Best blockchain?");
        let options = vec![
            &env,
            String::from_str(&env, "Stellar"),
            String::from_str(&env, "Ethereum"),
        ];

        client.initialize(&owner, &question, &options, &5000);

        let poll = client.get_poll();
        assert_eq!(poll.question, question);
        assert_eq!(poll.options.len(), 2);
        assert_eq!(poll.total_votes, 0);
    }

    #[test]
    fn test_cast_vote() {
        let (env, owner, client) = setup();

        let question = String::from_str(&env, "Best blockchain?");
        let options = vec![
            &env,
            String::from_str(&env, "Stellar"),
            String::from_str(&env, "Ethereum"),
        ];
        client.initialize(&owner, &question, &options, &5000);

        let voter = Address::generate(&env);
        client.vote(&voter, &0);

        assert!(client.has_voted(&voter));
        let results = client.get_results(&2);
        assert_eq!(results.get(0).unwrap(), 1);
        assert_eq!(results.get(1).unwrap(), 0);
    }

    #[test]
    #[should_panic(expected = "already voted")]
    fn test_double_vote_rejected() {
        let (env, owner, client) = setup();

        let question = String::from_str(&env, "Best blockchain?");
        let options = vec![
            &env,
            String::from_str(&env, "Stellar"),
            String::from_str(&env, "Ethereum"),
        ];
        client.initialize(&owner, &question, &options, &5000);

        let voter = Address::generate(&env);
        client.vote(&voter, &0);
        client.vote(&voter, &1);
    }

    #[test]
    #[should_panic(expected = "voting has ended")]
    fn test_vote_after_deadline_rejected() {
        let (env, owner, client) = setup();

        let question = String::from_str(&env, "Best blockchain?");
        let options = vec![
            &env,
            String::from_str(&env, "Stellar"),
            String::from_str(&env, "Ethereum"),
        ];
        client.initialize(&owner, &question, &options, &2000);

        Ledger::set(&env.ledger(), LedgerInfo {
            timestamp: 3000,
            protocol_version: 27,
            sequence_number: 0,
            network_id: [0; 32],
            base_reserve: 10,
            min_persistent_entry_ttl: 4096,
            min_temp_entry_ttl: 16,
            max_entry_ttl: 6312000,
        });

        let voter = Address::generate(&env);
        client.vote(&voter, &0);
    }
}
