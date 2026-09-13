# Project Overview: BendLens

> **Universal Backend Architecture & Blast-Radius Platform**  
> *100% Local-First, Air-Gapped, and Completely Private.*

## 1. What is BendLens?
BendLens (Backend Lens) is an enterprise-grade backend architecture visualization and blast-radius impact analysis platform. It inspects polyglot backend codebases, database DDLs, Docker/Kubernetes infrastructure configs, and ORMs to produce:
1. **Multi-tier visual architecture diagrams** (ERD, High-Level C4 Container, Low-Level Component Call Graph, and Request Execution Sequence).
2. **Interactive "What-If" Blast Radius Simulation** to foresee cascading downstream breaking changes before altering tables, columns, constraints, or API routes.
3. **3-Tier Persona Intelligence** translating raw ASTs into targeted views for Developers, Engineering Managers, and Business Owners.

## 2. Core Value Propositions & Philosophies
- **Zero Cloud Leakage**: Proprietary source code, database DDLs, and database credentials never leave the user's workstation.
- **In-Memory Parsing**: AST parsing, schema discovery, graph traversal, and diagram generation run in memory without requiring cloud LLMs or SaaS dependencies.
- **Universal Polyglot Ingestion**:
  - **SQL Dialects**: PostgreSQL, MySQL, MariaDB, SQLite, SQL Server (T-SQL), Oracle.
  - **ORMs**: Prisma, TypeORM, Sequelize, Mongoose/MongoDB, Drizzle, SQLAlchemy, Django, Hibernate, EF Core, GORM.
  - **Languages**: JavaScript/TypeScript, Python, Java, Go, C#.
  - **Infrastructure**: Dockerfile, Docker Compose, OpenAPI/Swagger.
- **Cross-Platform Availability**: Runs as a local Next.js web application (`http://localhost:3000`) or as a native Windows desktop executable with an instant (<50ms) splash screen.
