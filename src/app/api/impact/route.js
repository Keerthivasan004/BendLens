import { NextResponse } from 'next/server';
import fs from 'fs';
const { getSampleProjectPath } = require('@/lib/appPaths');
const ProjectAnalyzer = require('@/lib/analyzer');
const ImpactAnalyzer = require('@/lib/generators/impactAnalyzer');
const KnowledgeGraph = require('@/lib/graph/knowledgeGraph');
const serverCache = require('@/lib/serverCache');

export async function POST(request) {
  try {
    const body = (await request.json().catch(() => ({}))) || {};
    let targetPath = (body.path || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();

    // Check server memory cache first for high speed and to support pasted/temp projects
    let analysis = null;
    if (targetPath) {
      analysis = serverCache.getByPath(targetPath);
    }
    if (!analysis) {
      analysis = serverCache.getLatest();
    }
    // If not in cache or path is specified and exists, analyze directory
    if (!analysis || (targetPath && fs.existsSync(targetPath) && (!analysis.projectPath || analysis.projectPath !== targetPath))) {
      const pathToAnalyze = (targetPath && fs.existsSync(targetPath)) ? targetPath : getSampleProjectPath();
      analysis = ProjectAnalyzer.analyze(pathToAnalyze);
    }

    const targetName = body.targetName || body.tableName || 'orders';
    const targetType = body.targetType || 'table';
    const changeType = body.changeType || (body.columnName ? 'column_name' : body.keyName ? 'key' : 'table_name');
    const columnName = body.columnName || null;
    const keyName = body.keyName || null;
    const action = body.action || 'rename';
    const newValue = body.newValue || '';

    // Reconstruct graph
    const graph = new KnowledgeGraph();
    graph.build(analysis.schema, analysis.code, analysis.infra);

    const impactAnalyzer = new ImpactAnalyzer(graph, analysis.schema, analysis.code);
    const impactResult = impactAnalyzer.analyzeModification({
      targetName,
      targetType,
      changeType,
      columnName,
      keyName,
      action,
      newValue
    });

    return NextResponse.json({ success: true, data: impactResult });
  } catch (error) {
    console.error('Impact calculation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate impact' },
      { status: 400 }
    );
  }
}

