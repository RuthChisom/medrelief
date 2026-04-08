# 🏥 MedRelief — Decentralized Emergency Healthcare Funding

MedRelief is a decentralized application that enables transparent, trustless, and community-driven emergency healthcare funding. It allows users to request financial assistance for medical needs, while a group of validators reviews and approves requests before funds are automatically released from a shared pool.

Built on **Polkadot Hub’s EVM-compatible environment** using **Solidity** and **OpenZeppelin contracts**, MedRelief demonstrates how smart contracts can be used to manage real-world resources with accountability and minimal friction.

---

# ✨ Key Features

- 💰 **Emergency Fund Pool** — Users can deposit funds into a shared pool
- 📝 **Emergency Requests** — Users submit requests describing their medical needs
- ✅ **Validator Approval System** — Selected validators review and approve requests
- ⚖️ **Multi-Approval Threshold** — Requests require a minimum number of approvals
- 🚀 **Automatic Execution** — Funds are released automatically once approvals are met
- 👥 **Validator Management** — Admin can add/remove validators
- 🔍 **Request Transparency** — All requests and approvals are visible on-chain
- 🧾 **Structured Request Display** — Requests are enriched and displayed as readable reports in the UI

---

# 🧠 How It Works

1. A user deposits funds into the MedRelief pool  
2. The user submits an emergency request with details (reason + optional metadata)  
3. Validators review the request  
4. Validators approve the request if it meets criteria  
5. Once the required number of approvals is reached:
   - The request is automatically executed  
   - Funds are transferred to the requester  
6. The request status is updated as executed  

---

# 🏗️ Tech Stack

- **Smart Contracts**: Solidity  
- **Framework**: Foundry  
- **Libraries**: OpenZeppelin (AccessControl, security primitives)  
- **Frontend**: Next.js (App Router)  
- **Web3 Interaction**: ethers.js  
- **Network**: Polkadot Hub (EVM-compatible)  

---

# ⚙️ Local Installation Guide

This guide helps judges run and test the project locally.

## 📦 Prerequisites

- Node.js (v18+)
- npm or yarn
- Foundry installed
- MetaMask browser extension

---

## 🧱 1. Clone the Repository

```bash
git clone https://github.com/RuthChisom/medrelief
cd medrelief
````

---

## 📜 2. Install Dependencies

### Smart Contracts (Foundry)

```bash
forge install
```

### Frontend

```bash
cd frontend
npm install
```

---

## 🔐 3. Configure Environment

Create a `.env` file in the frontend:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xA57B95e94D45BF4D8A056a2b6ce71989d9739D6A
```

---

## 🚀 4. Deploy Smart Contract (Optional for Judges)

Using Foundry:

```bash
forge script script/Deploy.s.sol --rpc-url <RPC_URL> --private-key <PRIVATE_KEY> --broadcast
```

Copy the deployed contract address into your `.env` file.

---

## 🌐 5. Run the Frontend

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 🦊 6. Connect Wallet

* Open MetaMask
* Connect to the Polkadot Hub EVM network
* Import or use a funded test account

---

## 🧪 7. Test Core Features

* Deposit funds into the pool
* Create an emergency request
* Add validators (admin only)
* Approve requests (validator only)
* Observe automatic execution when threshold is met
* View request status updates (pending → executed)

---

# 🛣️ Roadmap

## Phase 1 (Current)

* Emergency request submission
* Validator approval system
* Automatic execution of approved requests
* Basic UI for deposits and requests

## Phase 2

* Reputation scoring for validators
* User identity attestation (optional verification layer)
* Better analytics dashboard for fund tracking

## Phase 3

* Integration with real-world healthcare providers
* Optional document verification (off-chain)
* Mobile-friendly and cross-platform UX improvements

## Phase 4

* DAO-based governance for validator selection
* Token-based incentives for validators
* Expanded public good funding mechanisms

---

# 💡 Innovative Idea

MedRelief introduces a **decentralized emergency funding system** where:

* Financial aid is governed by **community validators instead of centralized authorities**
* Smart contracts enforce transparency and automatic fund distribution
* Off-chain structured data combined with on-chain logic enables flexible yet accountable decision-making

This model bridges **real-world healthcare needs** with **blockchain-based trust systems**, enabling faster and fairer access to emergency support.

---

# 🔗 Track Relevance

## ✅ EVM Track

* Smart contracts written in **Solidity**
* Fully compatible with **EVM infrastructure on Polkadot Hub**
* Uses standard EVM tooling (Foundry, ethers.js, MetaMask)
* Demonstrates non-trivial logic:

  * Role-based access control
  * Multi-validator approval system
  * Automatic execution of funds

---

## ✅ OpenZeppelin Track

MedRelief heavily utilizes OpenZeppelin contracts:

* **AccessControl**

  * Used to define admin and validator roles
* Role-based permissions for secure operations
* Extensible and secure contract design
* Demonstrates meaningful use beyond ERC token standards

---

# 🔐 Security Considerations

* Role-based access control for validators and admin
* Only authorized validators can approve requests
* Multi-signature-like approval threshold
* Automatic execution only when conditions are met
* Protection against unauthorized fund withdrawals

---

# 👨‍💻 About the Project

MedRelief was built as a solo project to demonstrate how blockchain technology can solve real-world problems in healthcare funding by combining decentralization, transparency, and community governance.

---

# 🚀 Future Vision

MedRelief aims to evolve into a global decentralized infrastructure for emergency funding, enabling:

* Community-driven healthcare support systems
* Cross-border emergency assistance
* Transparent and verifiable fund allocation
* Scalable validator-based governance models

---