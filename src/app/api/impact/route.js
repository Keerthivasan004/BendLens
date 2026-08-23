import { NextResponse } from 'next/server';
import path from 'path';
const ProjectAnalyzer = require('@/lib/analyzer');
const ImpactAnalyzer = require('@/lib/generators/impactAnalyzer');
const KnowledgeGraph = require('@/lib/graph/knowledgeGraph');

export async function POST(request) {
  try {
    const body = await request.json();
    let targetPath = (body.path || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!targetPath) {
      targetPath = path.join(process.cwd(), 'sample_project');
    }
    const targetName = body.targetName || 'orders';
    const targetType = body.targetType || 'table';

    // Run analysis to get base graph and schema
    const analysis = ProjectAnalyzer.analyze(targetPath);
    
    // Reconstruct graph
    const graph = new KnowledgeGraph();
    for (const n of analysis.graph.nodes) graph.addNode(n);
    for (const e of analysis.graph.edges) graph.addEdge(e);

    const impactAnalyzer = new ImpactAnalyzer(graph, analysis.schema, analysis.code);
    const impactResult = impactAnalyzer.analyzeModification(targetName, targetType);

    return NextResponse.json({ success: true, data: impactResult });
  } catch (error) {
    console.error('Impact calculation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate impact' },
      { status: 400 }
    );
  }
}
