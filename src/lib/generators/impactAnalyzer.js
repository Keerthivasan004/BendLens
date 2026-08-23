/**
 * What-If Impact & Blast Radius Analyzer
 * Evaluates the ripple effects and risk of modifying any database table,
 * column, service, function, or API endpoint.
 */
class ImpactAnalyzer {
  constructor(knowledgeGraph, schemaData = {}, codeData = {}) {
    this.graph = knowledgeGraph;
    this.schemaData = schemaData;
    this.codeData = codeData;
  }

  static simulate(knowledgeGraph, targetName = 'orders', targetType = 'table', schemaData = {}, codeData = {}) {
    const analyzer = new ImpactAnalyzer(knowledgeGraph, schemaData, codeData);
    return analyzer.analyzeModification(targetName, targetType);
  }

  analyzeModification(targetName = 'orders', targetType = 'table') {
    // 1. Locate node or matching entity in graph
    const matchingNode = Array.from(this.graph.nodes.values()).find(
      n => n.name.toLowerCase() === targetName.toLowerCase() || n.id.toLowerCase().includes(targetName.toLowerCase())
    );

    const nodeId = matchingNode ? matchingNode.id : targetName;
    const impactResult = this.graph.getDownstreamImpact(nodeId);

    // 2. Identify database cascades
    const directRelations = (this.schemaData.relations || []).filter(
      r => r.targetTable?.toLowerCase() === targetName.toLowerCase() || r.sourceTable?.toLowerCase() === targetName.toLowerCase()
    );

    // 3. Identify API Endpoints that depend on this
    const affectedAPIs = (this.codeData.endpoints || []).filter(ep => {
      return ep.path?.toLowerCase().includes(targetName.toLowerCase()) ||
             (ep.module && ep.module.toLowerCase().includes(targetName.toLowerCase())) ||
             impactResult.impactedEndpoints.some(ie => ie.name === ep.path);
    });

    // 4. Identify Affected Business Capabilities
    const businessWorkflows = this.inferBusinessWorkflows(targetName, affectedAPIs);

    // 5. Generate Role-Specific Impact Cards
    const developerActionItems = [
      `Review API contract changes on ${affectedAPIs.length > 0 ? affectedAPIs.map(a => `${a.method} ${a.path}`).join(', ') : 'dependent endpoints'}.`,
      `Update unit tests and mock fixtures for ${targetName}.`,
      directRelations.length > 0 ? `Verify Foreign Key cascading constraints on tables: ${directRelations.map(r => r.sourceTable).join(', ')}.` : `Verify database schema migrations.`
    ];

    const managerRiskSummary = {
      overallRisk: impactResult.riskLevel,
      riskScore: impactResult.riskScore,
      estimatedRefactorEffort: impactResult.riskScore > 70 ? '3-5 Days (High Regression Risk)' : impactResult.riskScore > 40 ? '1-2 Days (Moderate Testing)' : 'Half Day (Low Risk)',
      affectedTeams: ['Backend Core Team', 'Frontend / Mobile Team', 'QA & Automation Team'],
      breakingChangeAlert: impactResult.riskScore > 60
    };

    const businessImpactStatement = {
      businessDomain: businessWorkflows.domain,
      userFacingImpact: businessWorkflows.userImpact,
      revenueOrOperationRisk: businessWorkflows.financialRisk,
      plainEnglishSummary: `Modifying [${targetName}] will trigger changes in ${businessWorkflows.workflows.join(', ')}. If schema constraints change without backward compatibility, users executing ${businessWorkflows.domain} transactions may encounter errors.`
    };

    return {
      target: {
        name: targetName,
        type: targetType,
        node: matchingNode || { name: targetName, type: targetType }
      },
      blastRadius: {
        totalAffectedComponents: Math.max(impactResult.totalImpactedCount, directRelations.length + affectedAPIs.length),
        riskScore: impactResult.riskScore,
        riskLevel: impactResult.riskLevel,
        directRelations,
        affectedAPIs,
        affectedNodes: impactResult.impactedNodes
      },
      personaInsights: {
        developer: {
          actionItems: developerActionItems,
          affectedCallers: impactResult.impactedNodes.slice(0, 6)
        },
        manager: managerRiskSummary,
        business: businessImpactStatement
      }
    };
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
    } else if (name.includes('product') || name.includes('catalog') || name.includes('item')) {
      return {
        domain: 'Product Catalog & Inventory',
        workflows: ['Catalog Browsing', 'Search & Filtering', 'Inventory Sync'],
        userImpact: 'Catalog browsing may show stale pricing or unavailable products.',
        financialRisk: 'Medium - Affects conversion rate and search discoverability.'
      };
    }

    return {
      domain: 'Core System Infrastructure',
      workflows: ['Background Jobs', 'Data Analytics', 'Notification Dispatch'],
      userImpact: 'Potential latency or background task delays.',
      financialRisk: 'Low to Moderate - Non-blocking operational workflows.'
    };
  }
}

module.exports = ImpactAnalyzer;
