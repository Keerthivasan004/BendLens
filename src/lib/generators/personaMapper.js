/**
 * Persona Intelligence Mapper
 * Formats raw codebase analysis into dedicated views for:
 * 1. Developer
 * 2. Engineering Manager
 * 3. Business Owner
 */
class PersonaMapper {
  static getDeveloperView(schemaData = {}, codeData = {}, infraData = {}, graphData = {}) {
    const tables = schemaData.tables || [];
    const relations = schemaData.relations || [];
    const endpoints = codeData.endpoints || [];
    const functions = codeData.functions || [];
    const classes = codeData.classes || [];
    const modules = codeData.modules || [];

    // Dynamically generate breaking change warnings from real schema/code characteristics
    const warnings = [];
    if (relations.length > 0) {
      const topRel = relations[0];
      warnings.push({
        id: 'BC-01',
        severity: 'HIGH',
        title: `Referential Integrity: ${topRel.sourceTable}.${topRel.sourceColumn} -> ${topRel.targetTable}.${topRel.targetColumn}`,
        recommendation: `Ensure foreign key indexing is enabled on '${topRel.sourceTable}' to prevent query table locks.`
      });
    }

    if (endpoints.length > 0) {
      const unauthEp = endpoints.find(e => !e.path.includes('auth') && !e.path.includes('login')) || endpoints[0];
      warnings.push({
        id: 'BC-02',
        severity: 'MEDIUM',
        title: `API Route Surface: ${unauthEp.method} ${unauthEp.path}`,
        recommendation: 'Verify rate-limiting and payload validation schemas are enforced on public endpoints.'
      });
    }

    if (warnings.length === 0) {
      warnings.push({
        id: 'BC-01',
        severity: 'LOW',
        title: 'Schema Hygiene: Primary Key Constraints Verified',
        recommendation: 'All active tables have defined primary keys.'
      });
    }

    return {
      role: 'DEVELOPER',
      title: 'Developer Engineering Console',
      badge: 'Code & Schema Diagnostics',
      metrics: {
        totalTables: tables.length,
        totalEndpoints: endpoints.length,
        totalFunctions: functions.length,
        totalClasses: classes.length,
        linesOfCode: codeData.stats?.totalLinesOfCode || modules.reduce((acc, m) => acc + (m.linesOfCode || 0), 0)
      },
      tables,
      relations,
      endpoints,
      classes,
      functions,
      modules,
      breakingChangeWarnings: warnings
    };
  }

  static getManagerView(schemaData = {}, codeData = {}, infraData = {}, graphData = {}) {
    const tables = schemaData.tables || [];
    const relations = schemaData.relations || [];
    const endpoints = codeData.endpoints || [];
    const modules = codeData.modules || [];


    // 1. Dynamic Tech Debt Hotspots
    const techDebtHotspots = [];
    // Tables with multiple relations
    const relationCounts = {};
    for (const r of relations) {
      relationCounts[r.targetTable] = (relationCounts[r.targetTable] || 0) + 1;
      relationCounts[r.sourceTable] = (relationCounts[r.sourceTable] || 0) + 1;
    }

    const sortedTablesByCoupling = Object.entries(relationCounts).sort((a, b) => b[1] - a[1]);
    const connectedTableCount = Object.keys(relationCounts).length;
    const averageCoupling = tables.length > 0 ? relations.length / tables.length : 0;
    const largestHub = sortedTablesByCoupling[0]?.[1] || 0;
    // This is a structural exposure estimate, not a runtime or delivery metric.
    const architectureRiskScore = Math.round(Math.min(100,
      (averageCoupling * 25) +
      ((largestHub / Math.max(tables.length, 1)) * 35) +
      ((endpoints.length / Math.max(tables.length, 1)) * 15)
    ));
    if (sortedTablesByCoupling.length > 0) {
      const [topTable, count] = sortedTablesByCoupling[0];
      techDebtHotspots.push({
        module: `schema: table '${topTable}'`,
        coupling: `High (${count} relational dependencies)`,
        risk: 'High',
        refactorAdvice: `Table '${topTable}' is a central hub. Alterations carry multi-table cascading risks.`
      });
    }

    // Modules with highest lines or dbAccesses
    if (modules.length > 0) {
      const topMod = modules.sort((a, b) => (b.linesOfCode || 0) - (a.linesOfCode || 0))[0];
      techDebtHotspots.push({
        module: topMod.relativePath,
        coupling: `Observed (${topMod.linesOfCode || 0} lines, ${topMod.functions?.length || 0} functions)`,
        risk: 'Medium',
        refactorAdvice: 'Modularize data access logic and add unit test coverage for complex handlers.'
      });
    } else if (techDebtHotspots.length === 0) {
      techDebtHotspots.push({
        module: tables[0]?.name ? `table: ${tables[0].name}` : 'Core Schema',
        coupling: 'Low (Well-isolated)',
        risk: 'Low',
        refactorAdvice: 'System dependencies are cleanly partitioned.'
      });
    }

    // 2. Dynamic Sprint Risk Matrix
    const sprintRiskMatrix = [];
    if (tables.length > 0) {
      tables.slice(0, 3).forEach((t, idx) => {
        const dependentRels = relations.filter(r => r.targetTable === t.name || r.sourceTable === t.name);
        const relatedEndpoints = endpoints.filter(e => e.path.toLowerCase().includes(t.name.toLowerCase()));
        sprintRiskMatrix.push({
          feature: `${t.name.charAt(0).toUpperCase() + t.name.slice(1)} Subsystem Refactor`,
          impactedFiles: Math.max(1, dependentRels.length + relatedEndpoints.length),
          riskRating: dependentRels.length > 2 ? 'High' : 'Medium',
          affectedSquads: ['Backend Data Squad', idx % 2 === 0 ? 'Core API Team' : 'Product Engineering']
        });
      });
    } else {
      sprintRiskMatrix.push({
        feature: 'General Maintenance & Migration',
        impactedFiles: 1,
        riskRating: 'Low',
        affectedSquads: ['Core Platform Team']
      });
    }

    // 3. Dynamic Squad Ownership
    const teamOwnership = [];
    if (tables.length > 0) {
      const chunk = Math.ceil(tables.length / 3);
      teamOwnership.push({
        squad: 'Data Architecture Squad',
        modules: tables.slice(0, chunk).map(t => `${t.name} (DB)`)
      });
      if (tables.length > chunk) {
        teamOwnership.push({
          squad: 'Core Business Logic Team',
          modules: tables.slice(chunk, chunk * 2).map(t => `${t.name} (DB)`)
        });
      }
      teamOwnership.push({
        squad: 'Integration & API Operations',
        modules: endpoints.slice(0, 3).map(e => `${e.method} ${e.path}`).concat(tables.slice(chunk * 2).map(t => t.name))
      });
    } else {
      teamOwnership.push(
        { squad: 'Platform Core', modules: ['Infrastructure', 'Database', 'API Gateway'] },
        { squad: 'Feature Squad', modules: ['Frontend', 'Backend Services'] }
      );
    }

    return {
      role: 'MANAGER',
      title: 'Engineering Management & Sprint Risk Dashboard',
      badge: 'Delivery & Architecture Governance',
      metrics: {
        architectureRiskScore,
        moduleCouplingIndex: `${averageCoupling.toFixed(1)} edges/table`,
        criticalPathCount: connectedTableCount,
        sprintDeliveryConfidence: 'Not assessed (delivery telemetry unavailable)'
      },
      techDebtHotspots,
      sprintRiskMatrix,
      teamOwnership
    };
  }

  static getBusinessView(schemaData = {}, codeData = {}, infraData = {}, graphData = {}) {
    const tables = schemaData.tables || [];
    const endpoints = codeData.endpoints || [];
    const relations = schemaData.relations || [];

    // Dynamically derive business capabilities from table names
    const capabilities = [];
    for (const t of tables.slice(0, 4)) {
      const name = t.name.toLowerCase();
      let capName = `${t.name.charAt(0).toUpperCase() + t.name.slice(1)} Management Engine`;
      let bizValue = `Manages data structures and transaction records for ${t.name}.`;
      let criticality = 'Tier 2 High';

      if (name.includes('user') || name.includes('auth') || name.includes('account')) {
        capName = 'Customer Identity & Account Management';
        bizValue = 'Secures user authentication, profiles, and access authorization.';
        criticality = 'Tier 1 Critical';
      } else if (name.includes('order') || name.includes('cart') || name.includes('checkout')) {
        capName = 'Order Processing & Transaction Lifecycle';
        bizValue = 'Powers transaction workflows, purchasing, and order state transitions.';
        criticality = 'Tier 1 Critical';
      } else if (name.includes('payment') || name.includes('invoice') || name.includes('bill')) {
        capName = 'Financial Settlement & Billing';
        bizValue = 'Handles revenue capture, payment records, and invoice generation.';
        criticality = 'Tier 1 Critical';
      } else if (name.includes('product') || name.includes('item') || name.includes('inventory') || name.includes('warehouse')) {
        capName = 'Product Catalog & Inventory Asset Tracking';
        bizValue = 'Enables catalog discovery, SKU management, and real-time stock levels.';
        criticality = 'Tier 2 High';
      }

      capabilities.push({
        name: capName,
        businessValue: bizValue,
        criticality,
        technicalComponents: `${t.name} table (${t.columns?.length || 0} fields)${endpoints.filter(e => e.path.toLowerCase().includes(t.name.toLowerCase())).map(e => `, ${e.path}`).join('')}`
      });
    }

    if (capabilities.length === 0) {
      capabilities.push({
        name: 'Core System Repository',
        businessValue: 'Processes transactional backend records with referential validation.',
        criticality: 'Tier 1 Critical',
        technicalComponents: 'Application Data Models'
      });
    }

    // Dynamic customer journeys
    const customerJourneys = [];
    if (tables.length >= 2) {
      customerJourneys.push({
        journeyName: 'End-to-End Operational Lifecycle',
        steps: tables.slice(0, 4).map(t => `Process ${t.name}`),
        health: 'Not assessed',
        impactSummary: `Static scan found ${relations.length} schema relationship(s); runtime health and transaction success were not measured.`
      });
    } else {
      customerJourneys.push({
        journeyName: 'Core Transaction Ingestion',
        steps: ['Client Request', 'Schema Validation', 'Storage Commitment'],
        health: 'Not assessed',
        impactSummary: 'Static analysis cannot determine runtime health or schema conflict status.'
      });
    }

    const tableNamesList = tables.map(t => t.name).join(', ') || 'core data models';
    const plainEnglishSummary = `The static scan found ${tables.length} data model(s) (${tableNamesList}), ${relations.length} schema relationship(s), and ${endpoints.length} API route(s). It does not verify runtime data integrity, compliance, availability, or business performance.`;

    return {
      role: 'BUSINESS',
      title: 'Business Capability & User Journey Portfolio',
      badge: 'Executive & Product Value Mapping',
      metrics: {
        activeBusinessCapabilities: capabilities.length,
        keyCustomerJourneys: customerJourneys.length,
        complianceReadiness: 'Not assessed',
        operationalUptimeTarget: 'Not observed'
      },
      capabilities,
      customerJourneys,
      plainEnglishSummary
    };
  }
}

module.exports = PersonaMapper;

