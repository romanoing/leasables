
# Leasables 

#### A Smart Contract Protocol for Lease Transactions

The `Leasables` protocol models the relationship between a Lessor and Lessee and facilitates its execution thru the agreement's lifecycle. 

<img src="docs/images/leasable_flows.png" width="500">

The contracts capture the essential elements of any lease agreement for any asset or resource:

* Agreement details:
  * Start & end times, pickup & return locations and conditions
  * Terms of use for the lessee and the lessor's responsibilities
  * Payment rate, frequency and method
* Available actions:
  * Sign, Deposit, Approve, Pickup & Return, Withdraw & Finalize
* Handling funds:
  * Accepting lessee payments
  * Holding and releasing deposit and security funds in escrow
  * Distributed funds from the Leasable object's contract balance

This initial implementation is specialized for leasing cars but the underlying concepts apply to any object, asset or resource that can be "rented" for a period of time.

Key components:
* **[LeasableCar.sol](contracts/LeasableCar.sol)**: The on-chain representation of a car available for lease
* **[LeaseAgreement.sol](contracts/LeaseAgreement.sol)**: An agreement for a limited term contract between a LeasableCar and driver. This is a read-only document and meant to be translatable into a traditional legalish paper document that would be admissible in court.
* **[AgreementExecutor.sol](contracts/AgreementExecutor.sol)**: Implements the lifecycle of a LeaseAgreement. It keeps track of the agreement's state (included signatures, deposits, payments received ...), records ongoing changes and it is the access point thru which the driver, car and owners interact with the underlying lease agreement
* **[scripts/legalish_contract.js](scripts/legalish_contract.js)**: A tool to generate a "Legal" paper version of a lease agreement from its "smart contract" digital representation. The generated paper contract (e.g. [legalish_sample.txt](docs/legalish_sample.txt)) can be used off-chain within the existing legal system if (rarely but inevitably) things go wrong with an interaction on-chain.

## Setup

Essential Requirements:
* Solidity v5+
* Truffle v5+
* Web3.js v1+
* React v16.5+

Details: [Dev & Demo Environment Setup](docs/dev_env_setup.md)

### Short term lease agreements executed as smart contracts

**Using Leasables, any two participants in a decentralized network can come to an agreement on the terms of a lease that can be initiated, executed and enforced by a set of smart contracts in a trustless environment such as Ethereum.**

Each lease agreement's primary representation is a digital smart contract but it can also generate a corresponding traditional version in english (aka legalese) that is legally admissible in court if things go bad with the deal.

Implementing the lease transaction as a smart contract gives us all the benefits of doing business on a decentralized trustless platform where the transactions can cost less and can run more securely and efficiently. The lessor & lessee execute the deal without an intermediary between them. The network provides all the trust needed as it serves as witness to:
* What was agreed on in the contract
* What is the current state at each step
* What needs to be done to complete the transaction

The code includes a a rudimentary UI to illustrate how drivers, cars and car owners would interact thru the lifecycle of the agreement. See: [Demo Walkthru](docs/demo_walkthru.md)
