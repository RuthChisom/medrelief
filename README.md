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
```

### MedRelief deployed at on Polkadot Testnet: 0xA57B95e94D45BF4D8A056a2b6ce71989d9739D6A