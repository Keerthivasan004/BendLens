# 🔭 BendLens (Backend Lens)
> **Universal Backend Architecture & Blast-Radius Platform**  
> *100% Local-First, Air-Gapped, and Completely Private.*

---

## 🔒 Privacy & Local-First Philosophy
BendLens was engineered with **strict local-first architecture** (similar to tools like *Prisma Studio*, *Ollama*, and *LocalStack*):
- **Zero Cloud Leakage**: Your proprietary backend source code, SQL DDLs, and database credentials **never leave your machine**.
- **In-Memory Parsing**: All AST parsing, schema discovery, graph traversal, and diagram generation executes entirely in your local system's memory.
- **Zero Compliance Overhead**: No GDPR, HIPAA, SOC-2, or external data pipeline liability.

---

## 🌟 Key Capabilities

1. **🗄️ Universal Database & Schema Extraction**:
   - Supports **PostgreSQL**, **MySQL / MariaDB**, **SQLite**, **SQL Server (T-SQL)**, **Oracle**, **MongoDB (Mongoose)**, and **Prisma ORM**.
   - Includes an interactive **Spreadsheet Data Values Inspector** displaying sample rows and column values.

2. **📊 Multi-Tier Architecture Diagrams**:
   - **Database ERD**: Full entity-relationship diagrams with PK/FK constraint linkages.
   - **High-Level C4 Container (HLD)**: API Gateway, Microservice nodes, Docker Compose bindings, and persistent data tiers.
   - **Low-Level Call Graph (LLD)**: Controller-to-Service-to-Model call routing graph.
   - **Execution Sequence**: Step-by-step request/response transaction flows.

3. **💥 "What-If" Blast Radius Modification Simulator**:
   - Pick any database table, column, or API route.
   - Computes **Total Ripple Nodes**, cascading foreign key breaking risks, affected API contracts, and an automated mitigation checklist.

4. **🎭 3-Tier Persona Intelligence**:
   - **🧑‍💻 Developer Console**: AST symbol trees, endpoint contracts, breaking change hygiene alerts.
   - **👨‍💼 Engineering Manager**: Architecture risk score, module coupling index, technical debt hotspots, sprint risk matrix.
   - **🏢 Business Owner**: Business capability portfolio, customer user journeys, plain-English executive summary.

---

## 🚀 Quick Start (Local Run)

### Option 1: 1-Click Windows Launcher
Double-click **`run.bat`** in the project directory. It will install dependencies, launch the local server, and automatically open your default browser.

### Option 2: Command Line
```bash
# 1. Navigate to project directory
cd data-project

# 2. Install dependencies (first time only)
npm install

# 3. Start BendLens Studio
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

---

## 💻 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Custom Dark/Light Design System
- **Diagrams**: Mermaid.js Client Engine (Infinite Pan, Vector Zoom, SVG Export)
- **Icons**: Lucide Icons
- **Fonts**: Google Plus Jakarta Sans & JetBrains Mono

---

## 📄 License
MIT License - Open, Local, and Free to Use.
