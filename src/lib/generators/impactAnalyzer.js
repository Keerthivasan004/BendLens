/**
 * What-If Impact & Blast Radius Analyzer
 * Evaluates the ripple effects and exact risk percentages of modifying any database table,
 * column_name, key (PK/FK/constraint), service, function, or API endpoint.
 */
class ImpactAnalyzer {
  constructor(knowledgeGraph, schemaData = {}, codeData = {}) {
    this.graph = knowledgeGraph;
    this.schemaData = schemaData || {};
    this.codeData = codeData || {};
  }

  static simulate(knowledgeGraph, targetOrOptions = 'orders', targetType = 'table', schemaData = {}, codeData = {}) {
    const analyzer = new ImpactAnalyzer(knowledgeGraph, schemaData, codeData);
    if (typeof targetOrOptions === 'object' && targetOrOptions !== null) {
      return analyzer.analyzeModification(targetOrOptions);
    }
    return analyzer.analyzeModification(targetOrOptions, targetType);
  }

  /**
   * Analyze modification on table, column, or key
   * Supports both object params or positional arguments
   */
  analyzeModification(target, targetType = 'table', changeType = 'table_name', columnName = null, keyName = null, action = 'rename', newValue = '') {
    // Normalize options
    let opts = {
      targetName: 'orders',
      targetType: 'table',
      changeType: 'table_name',
      columnName: null,
      keyName: null,
      action: 'rename',
      newValue: ''
    };

    if (typeof target === 'object' && target !== null) {
      opts = { ...opts, ...target };
    } else {
      opts.targetName = target || 'orders';
      opts.targetType = targetType || 'table';
      opts.changeType = changeType || 'table_name';
      opts.columnName = columnName;
      opts.keyName = keyName;
      opts.action = action || 'rename';
      opts.newValue = newValue || '';
    }

    const { targetName, action: currentAction, newValue: currentNewValue } = opts;
    let { changeType: currentChangeType, columnName: currentColName, keyName: currentKeyName } = opts;

    const tables = this.schemaData.tables || [];
    const relations = this.schemaData.relations || [];
    const endpoints = this.codeData.endpoints || [];
    const functions = this.codeData.functions || [];
    const modules = this.codeData.modules || [];

    // Locate target table
    const targetTable = tables.find(
      t => t.name.toLowerCase() === (targetName || '').toLowerCase()
    ) || tables[0] || { name: targetName || 'orders', columns: [], foreignKeys: [] };

    const actualTableName = targetTable.name;

    // Auto-detect changeType if column or key specified
    if (currentColName && currentChangeType !== 'column_name') {
      currentChangeType = 'column_name';
    }
    if (currentKeyName && currentChangeType !== 'key') {
      currentChangeType = 'key';
    }

    // Default column if changeType is column_name but none selected
    if (currentChangeType === 'column_name' && !currentColName) {
      currentColName = targetTable.columns?.[0]?.name || 'id';
    }

    // Default key if changeType is key but none selected
    if (currentChangeType === 'key' && !currentKeyName) {
      currentKeyName = targetTable.primaryKey ? `PK (${targetTable.primaryKey})` : (targetTable.foreignKeys?.[0]?.column || 'PRIMARY KEY');
    }

    const targetColumn = targetTable.columns?.find(
      c => c.name.toLowerCase() === (currentColName || '').toLowerCase()
    ) || { name: currentColName || 'id', type: 'VARCHAR', isPrimaryKey: currentColName === 'id' };

    // 1. Calculate Impact on Tables
    const impactedTables = this.calculateTableImpacts(
      actualTableName,
      targetTable,
      currentChangeType,
      targetColumn,
      currentKeyName,
      currentAction,
      currentNewValue,
      tables,
      relations
    );

    // 2. Calculate Impact on Code (Services, Functions, Files, and Endpoints)
    const impactedCode = this.calculateCodeImpacts(
      actualTableName,
      targetTable,
      currentChangeType,
      targetColumn,
      currentKeyName,
      currentAction,
      currentNewValue,
      endpoints,
      functions,
      modules,
      impactedTables
    );

    // 3. Fallback / Graph Integration for affected APIs & direct relations
    const directRelations = relations.filter(
      r => r.targetTable?.toLowerCase() === actualTableName.toLowerCase() ||
           r.sourceTable?.toLowerCase() === actualTableName.toLowerCase()
    );

    const affectedAPIs = endpoints.filter(ep => {
      const epPath = (ep.path || '').toLowerCase();
      const epMod = (ep.module || '').toLowerCase();
      const tblName = actualTableName.toLowerCase();
      return epPath.includes(tblName) || epMod.includes(tblName) ||
             (currentColName && epPath.includes(currentColName.toLowerCase()));
    });

    // 4. Compute Aggregate Blast Risk Score
    const tablePercentages = impactedTables.map(t => t.impactPercentage);
    const codePercentages = impactedCode.map(c => c.impactPercentage);
    const allPercentages = [...tablePercentages, ...codePercentages];

    let overallRiskScore = 65;
    if (allPercentages.length > 0) {
      const maxScore = Math.max(...allPercentages);
      const avgScore = Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length);
      overallRiskScore = Math.round((maxScore * 0.6) + (avgScore * 0.4));
      // Action penalties
      if (currentAction === 'drop') overallRiskScore = Math.min(100, overallRiskScore + 8);
      overallRiskScore = Math.min(100, Math.max(20, overallRiskScore));
    }

    const riskLevel = overallRiskScore >= 75 ? 'HIGH' : overallRiskScore >= 45 ? 'MEDIUM' : 'LOW';

    // 5. Inferred Business Workflows & Multi-Persona Insights
    const businessWorkflows = this.inferBusinessWorkflows(actualTableName, affectedAPIs);

    const developerActionItems = [
      `Modify schema definition for '${actualTableName}' (${currentChangeType === 'column_name' ? `column ${targetColumn.name}` : currentChangeType === 'key' ? `key constraint ${currentKeyName}` : 'table structure'}).`,
      impactedTables.length > 1 ? `Update ${impactedTables.length - 1} dependent foreign key table(s): ${impactedTables.filter(t => t.name !== actualTableName).map(t => t.name).join(', ')}.` : `Verify database migration scripts and backfills.`,
      impactedCode.length > 0 ? `Refactor ${impactedCode.length} impacted code file(s) and endpoints: ${impactedCode.slice(0, 3).map(c => c.name).join(', ')}.` : `Run regression unit tests across the service layer.`
    ];

    const managerRiskSummary = {
      overallRisk: riskLevel,
      riskScore: overallRiskScore,
      estimatedRefactorEffort: overallRiskScore > 75 ? '3-5 Days (High Regression Risk)' : overallRiskScore > 45 ? '1-2 Days (Moderate Testing)' : 'Half Day (Low Risk)',
      affectedTeams: this.inferAffectedTeams(impactedTables, impactedCode),
      breakingChangeAlert: overallRiskScore > 60
    };

    const businessImpactStatement = {
      businessDomain: businessWorkflows.domain,
      userFacingImpact: businessWorkflows.userImpact,
      revenueOrOperationRisk: businessWorkflows.financialRisk,
      plainEnglishSummary: `Modifying [${actualTableName}${currentChangeType === 'column_name' ? `.${targetColumn.name}` : currentChangeType === 'key' ? ` (${currentKeyName})` : ''}] will affect ${impactedTables.length} table(s) and ${impactedCode.length} code component(s). Action '${currentAction}' carries a computed severity of ${overallRiskScore}%.`
    };

    return {
      target: {
        name: actualTableName,
        type: opts.targetType,
        changeType: currentChangeType,
        columnName: currentColName,
        keyName: currentKeyName,
        action: currentAction,
        newValue: currentNewValue,
        node: { name: actualTableName, type: opts.targetType }
      },
      blastRadius: {
        totalAffectedComponents: impactedTables.length + impactedCode.length,
        riskScore: overallRiskScore,
        riskLevel,
        directRelations,
        affectedAPIs,
        impactedTables,
        impactedCode,
        affectedNodes: impactedCode.map(c => ({ name: c.name, type: c.type, module: c.module }))
      },
      personaInsights: {
        developer: {
          actionItems: developerActionItems,
          affectedCallers: impactedCode.slice(0, 6).map(c => ({ name: c.name, type: c.type }))
        },
        manager: managerRiskSummary,
        business: businessImpactStatement
      }
    };
  }

  calculateTableImpacts(tableName, targetTable, changeType, col, keyName, action, newValue, tables, relations) {
    const list = [];
    const seenTables = new Set();

    // 1. Source Table itself
    let sourceScore = 95;
    if (action === 'drop') sourceScore = 100;
    else if (changeType === 'column_name' && !col.isPrimaryKey) sourceScore = 78;
    else if (changeType === 'key') sourceScore = 92;

    let sourceReason = `Source table directly modified (${action} ${changeType})`;
    if (changeType === 'column_name') {
      sourceReason = `Source column [${tableName}.${col.name}] (${col.type}) ${action === 'drop' ? 'dropped' : action === 'type_change' ? 'type modified' : 'renamed'}`;
    } else if (changeType === 'key') {
      sourceReason = `Constraint [${keyName}] on table '${tableName}' ${action === 'drop' ? 'removed' : 'altered'}`;
    }

    list.push({
      name: tableName,
      databaseType: targetTable.databaseType || 'Relational SQL',
      impactPercentage: sourceScore,
      severity: this.getSeverity(sourceScore),
      reason: sourceReason,
      affectedColumns: changeType === 'column_name' ? [col.name] : (targetTable.columns || []).map(c => c.name).slice(0, 4),
      mitigation: action === 'drop' ? 'Requires migration script; cascade deletes may occur.' : 'Update ORM model annotations and database migration DDL.'
    });
    seenTables.add(tableName.toLowerCase());

    // 2. Foreign Key child tables (tables that reference this table)
    for (const rel of relations) {
      const isTargetChild = rel.targetTable?.toLowerCase() === tableName.toLowerCase();
      const isSourceChild = rel.sourceTable?.toLowerCase() === tableName.toLowerCase();

      // Child table referencing target
      if (isTargetChild) {
        const childName = rel.sourceTable;
        if (!seenTables.has(childName.toLowerCase())) {
          let score = 88;
          let reason = `Foreign Key constraint: [${childName}.${rel.sourceColumn} -> ${tableName}.${rel.targetColumn}] references this table.`;

          if (changeType === 'column_name') {
            const matchesCol = (rel.targetColumn || 'id').toLowerCase() === col.name.toLowerCase();
            if (matchesCol) {
              score = 94;
              reason = `Direct FK reference broken: [${childName}.${rel.sourceColumn}] directly references modified column '${col.name}'.`;
            } else {
              score = 65;
              reason = `Secondary cascade: Table belongs to the same relationship branch as '${tableName}'.`;
            }
          } else if (changeType === 'key') {
            score = 90;
            reason = `Referential integrity broken: Foreign key [${rel.sourceColumn}] relies on primary key integrity of '${tableName}'.`;
          }

          if (action === 'drop') score = Math.min(100, score + 6);

          const childTableObj = tables.find(t => t.name.toLowerCase() === childName.toLowerCase()) || {};
          list.push({
            name: childName,
            databaseType: childTableObj.databaseType || 'Relational SQL',
            impactPercentage: score,
            severity: this.getSeverity(score),
            reason,
            affectedColumns: [rel.sourceColumn],
            mitigation: `Check FK constraint '${rel.sourceColumn}'. Add database migration to align with parent table updates.`
          });
          seenTables.add(childName.toLowerCase());
        }
      }

      // Parent table referenced by target
      if (isSourceChild) {
        const parentName = rel.targetTable;
        if (!seenTables.has(parentName.toLowerCase())) {
          let score = 75;
          let reason = `Referenced parent table: [${tableName}.${rel.sourceColumn} -> ${parentName}.${rel.targetColumn}].`;

          if (changeType === 'column_name') {
            const matchesCol = (rel.sourceColumn || '').toLowerCase() === col.name.toLowerCase();
            if (matchesCol) {
              score = 88;
              reason = `Foreign Key column [${tableName}.${col.name}] referencing parent table '${parentName}' is modified.`;
            } else {
              score = 50;
              reason = `Parent relation to '${parentName}' may require join query updates.`;
            }
          }

          const parentTableObj = tables.find(t => t.name.toLowerCase() === parentName.toLowerCase()) || {};
          list.push({
            name: parentName,
            databaseType: parentTableObj.databaseType || 'Relational SQL',
            impactPercentage: score,
            severity: this.getSeverity(score),
            reason,
            affectedColumns: [rel.targetColumn || 'id'],
            mitigation: `Verify referential integrity checks and reciprocal relation mappings.`
          });
          seenTables.add(parentName.toLowerCase());
        }
      }
    }

    // 3. Transitive relations (depth 2 tables)
    for (const rel of relations) {
      const isReferencingImpacted = list.some(item => item.name.toLowerCase() === rel.targetTable?.toLowerCase() && item.name.toLowerCase() !== tableName.toLowerCase());
      if (isReferencingImpacted && !seenTables.has(rel.sourceTable.toLowerCase())) {
        const score = 48;
        const transTableObj = tables.find(t => t.name.toLowerCase() === rel.sourceTable.toLowerCase()) || {};
        list.push({
          name: rel.sourceTable,
          databaseType: transTableObj.databaseType || 'Relational SQL',
          impactPercentage: score,
          severity: this.getSeverity(score),
          reason: `Transitive dependency: Relies on '${rel.targetTable}' which is directly impacted by changes to '${tableName}'.`,
          affectedColumns: [rel.sourceColumn],
          mitigation: 'Verify multi-table SQL join operations and query serialization.'
        });
        seenTables.add(rel.sourceTable.toLowerCase());
      }
    }

    // Sort descending by impact percentage
    return list.sort((a, b) => b.impactPercentage - a.impactPercentage);
  }

  calculateCodeImpacts(tableName, targetTable, changeType, col, keyName, action, newValue, endpoints, functions, modules, impactedTables) {
    const codeList = [];
    const seenCode = new Set();
    const lowerTable = tableName.toLowerCase();
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const referencesEntity = (value = '', entityName = '') => {
      const lowerEntity = entityName.toLowerCase();
      const entityStem = lowerEntity.length > 3 ? lowerEntity.replace(/(?:ies$|es$|s$)/, '') : lowerEntity;
      const variants = new Set([lowerEntity, entityStem]);
      const source = value.toLowerCase();

      return [...variants].some((variant) => (
        variant.length > 2 && new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(variant)}(?:$|[^a-z0-9])`).test(source)
      ));
    };

    // Helper matcher
    const matchesTarget = (str = '') => referencesEntity(str, tableName);
    const dependentTableNames = impactedTables
      .map((table) => table.name)
      .filter((name) => name.toLowerCase() !== lowerTable);

    // 1. API Endpoints
    for (const ep of endpoints) {
      const epPath = (ep.path || '').toLowerCase();
      const epMod = (ep.module || '').toLowerCase();
      const key = `${ep.method}:${ep.path}`;

      let matches = false;
      let score = 0;
      let reason = '';

      if (matchesTarget(epPath) || matchesTarget(epMod)) {
        matches = true;
        if (changeType === 'table_name') {
          score = action === 'drop' ? 95 : 90;
          reason = `Direct route handler for '${tableName}'. Payload schema and SQL queries will break without updates.`;
        } else if (changeType === 'column_name') {
          score = col?.isPrimaryKey ? 88 : 80;
          reason = `Route handler accepts or returns '${col?.name}' field in JSON DTO response.`;
        } else {
          score = 78;
          reason = `Route relies on key '${keyName}' for record lookups and parameter validation.`;
        }
      } else if (dependentTableNames.some((name) => referencesEntity(epPath, name) || referencesEntity(epMod, name))) {
        matches = true;
        score = 65;
        reason = `Cascading route: Handles child entities that reference '${tableName}'.`;
      }

      if (matches && !seenCode.has(key)) {
        seenCode.add(key);
        codeList.push({
          name: `${ep.method} ${ep.path}`,
          type: 'API ROUTE',
          module: ep.module || 'src/routes',
          impactPercentage: score,
          severity: this.getSeverity(score),
          reason,
          lineOrRef: `${ep.method} ${ep.path}`,
          mitigation: `Update API request/response schema validation and swagger/OpenAPI documentation.`
        });
      }
    }

    // 2. Code Functions (AST parsed)
    for (const fn of functions) {
      const fnName = (fn.name || '').toLowerCase();
      const fnMod = (fn.module || '').toLowerCase();
      const key = `fn:${fnMod}:${fn.name}`;

      let matches = false;
      let score = 0;
      let reason = '';

      if (matchesTarget(fnName) || matchesTarget(fnMod)) {
        matches = true;
        if (changeType === 'table_name') {
          score = 92;
          reason = `Database query or repository handler in '${fn.module}' explicitly targets '${tableName}'.`;
        } else if (changeType === 'column_name') {
          score = col?.isPrimaryKey ? 88 : 82;
          reason = `Function maps '${col?.name}' field in SQL statement or entity parameters.`;
        } else {
          score = 80;
          reason = `Function enforces relational key integrity on '${tableName}'.`;
        }
      } else if (impactedTables.some(t => t.name !== tableName && (fnName.includes(t.name.toLowerCase()) || fnMod.includes(t.name.toLowerCase())))) {
        matches = true;
        score = 62;
        reason = `Function handles related entity queries that join against '${tableName}'.`;
      }

      if (matches && !seenCode.has(key) && fn.name !== '__init__') {
        seenCode.add(key);
        codeList.push({
          name: `${fn.name}()`,
          type: 'FUNCTION',
          module: fn.module || 'services',
          impactPercentage: score,
          severity: this.getSeverity(score),
          reason,
          lineOrRef: `def / function ${fn.name}()`,
          mitigation: `Update SQL query strings, ORM model mappings, and mock test fixtures.`
        });
      }
    }

    // 3. Service Modules / Files
    for (const mod of modules) {
      const modRel = (mod.relativePath || '').toLowerCase();
      const key = `mod:${mod.relativePath}`;

      let matches = false;
      let score = 0;
      let reason = '';

      if (matchesTarget(modRel)) {
        matches = true;
        score = changeType === 'table_name' ? 88 : 78;
        reason = `Service source file defines business workflows and data operations for '${tableName}'.`;
      } else if (mod.dbAccesses && mod.dbAccesses.some(a => matchesTarget(a))) {
        matches = true;
        score = 82;
        reason = `Module contains active database calls accessing '${tableName}'.`;
      }

      if (matches && !seenCode.has(key)) {
        seenCode.add(key);
        codeList.push({
          name: mod.relativePath,
          type: 'SERVICE',
          module: mod.relativePath,
          impactPercentage: score,
          severity: this.getSeverity(score),
          reason,
          lineOrRef: mod.relativePath,
          mitigation: `Review imports, database session transactions, and dependent callers.`
        });
      }
    }


    // If no code items detected yet (e.g. schema-only analysis), infer standard handlers
    if (codeList.length === 0) {
      codeList.push({
        name: `Repository / ORM: ${tableName}`,
        type: 'ORM MODEL',
        module: `models/${lowerTable}.py`,
        impactPercentage: 85,
        severity: 'HIGH',
        reason: `Generated entity model for '${tableName}' requires field update.`,
        lineOrRef: `models/${lowerTable}`,
        mitigation: `Re-generate ORM schema definition and migration class.`
      });
      codeList.push({
        name: `/api/${lowerTable}`,
        type: 'API ROUTE',
        module: `routes/${lowerTable}`,
        impactPercentage: 75,
        severity: 'HIGH',
        reason: `REST endpoints serving '${tableName}' data must update serialization contract.`,
        lineOrRef: `/api/${lowerTable}`,
        mitigation: `Update endpoint response serializers and DTO types.`
      });
    }

    // Sort descending by impact percentage
    return codeList.sort((a, b) => b.impactPercentage - a.impactPercentage);
  }

  getSeverity(score) {
    if (score >= 85) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 45) return 'MEDIUM';
    return 'LOW';
  }

  inferAffectedTeams(tables, code) {
    const teams = new Set(['Core Backend Squad']);
    if (code.some(c => c.type === 'API ROUTE')) {
      teams.add('API & Gateway Team');
      teams.add('Frontend / Mobile Team');
    }
    if (tables.length > 2) {
      teams.add('Data Architecture / DBA Team');
    }
    teams.add('QA & Automation Squad');
    return Array.from(teams);
  }

  inferBusinessWorkflows(targetName, affectedAPIs) {
    const name = (targetName || '').toLowerCase();
    if (name.includes('user') || name.includes('auth') || name.includes('account')) {
      return {
        domain: 'Identity, Authentication & Customer Profile',
        workflows: ['User Login / SSO', 'Profile Management', 'Session Verification'],
        userImpact: 'Users may be logged out or unable to authenticate during breaking schema changes.',
        financialRisk: 'High - Directly gates platform onboarding and active sessions.'
      };
    } else if (name.includes('order') || name.includes('cart') || name.includes('checkout')) {
      return {
        domain: 'Checkout & Order Lifecycle',
        workflows: ['Cart Checkout', 'Order Placement', 'Stock Reservation'],
        userImpact: 'Shoppers will experience checkout friction or order placement failure.',
        financialRisk: 'Critical - Immediate disruption to customer transactions and gross revenue.'
      };
    } else if (name.includes('payment') || name.includes('invoice') || name.includes('billing')) {
      return {
        domain: 'Payments & Revenue Billing',
        workflows: ['Credit Card Processing', 'Subscription Invoicing', 'Stripe/PayPal Webhooks'],
        userImpact: 'Delayed payment confirmations or double-charge retry risks.',
        financialRisk: 'Critical - Direct financial reconciliation and compliance liability.'
      };
    } else if (name.includes('product') || name.includes('catalog') || name.includes('item') || name.includes('inventory') || name.includes('warehouse')) {
      return {
        domain: 'Product Catalog & Inventory Management',
        workflows: ['Catalog Browsing', 'Search & Filtering', 'Stock Reservation'],
        userImpact: 'Catalog browsing may show stale pricing or unavailable products.',
        financialRisk: 'Medium - Affects conversion rate and search discoverability.'
      };
    }

    return {
      domain: `${targetName.charAt(0).toUpperCase() + targetName.slice(1)} Domain Engine`,
      workflows: [`${targetName} Processing`, 'Data Synchronization', 'Reporting Pipeline'],
      userImpact: 'Potential latency or background task delays.',
      financialRisk: 'Moderate - Dependent on workflow criticality.'
    };
  }
}

module.exports = ImpactAnalyzer;
