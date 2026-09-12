'use client';

import React, { useMemo, useState } from 'react';

const NODE_WIDTH = 320;
const NODE_GAP_X = 90;
const NODE_GAP_Y = 64;
const TOP_PADDING = 56;
const LEFT_PADDING = 56;
const ROW_HEIGHT = 26;

function normalize(value = '') {
  return String(value).toLowerCase();
}

export default function DatabaseSchemaDiagram({ 
  schemaData, 
  filterQuery = '', 
  theme = 'dark',
  onSelectForImpact
}) {
  const [hoveredTable, setHoveredTable] = useState(null);
  const [hoveredRelation, setHoveredRelation] = useState(null);

  const tables = schemaData?.tables || [];
  const relations = schemaData?.relations || [];
  const query = normalize(filterQuery.trim());

  const visibleTables = useMemo(() => tables.filter((table) => {
    if (!query) return true;
    return normalize(table.name).includes(query) || table.columns?.some((column) => normalize(column.name).includes(query));
  }), [tables, query]);

  const layout = useMemo(() => {
    const count = Math.max(visibleTables.length, 1);
    let columns = 3;
    if (count <= 2) columns = count;
    else if (count <= 4) columns = 2;
    else if (count <= 9) columns = 3;
    else if (count <= 16) columns = 4;
    else columns = Math.ceil(Math.sqrt(count * 1.3));

    const positions = new Map();
    const rowHeights = [];

    visibleTables.forEach((table, index) => {
      const row = Math.floor(index / columns);
      const colCount = table.columns?.length || 0;
      const height = 56 + colCount * ROW_HEIGHT + 14;
      rowHeights[row] = Math.max(rowHeights[row] || 0, height);
    });

    const rowYPositions = [];
    let currentY = TOP_PADDING;
    for (let r = 0; r < rowHeights.length; r++) {
      rowYPositions[r] = currentY;
      currentY += (rowHeights[r] || 0) + NODE_GAP_Y;
    }

    visibleTables.forEach((table, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const y = rowYPositions[row];
      const colCount = table.columns?.length || 0;
      const height = 56 + colCount * ROW_HEIGHT + 14;
      positions.set(table.name, { x: LEFT_PADDING + column * (NODE_WIDTH + NODE_GAP_X), y, height });
    });

    const totalHeight = currentY + TOP_PADDING;
    return {
      positions,
      width: Math.max(920, LEFT_PADDING * 2 + columns * NODE_WIDTH + Math.max(0, columns - 1) * NODE_GAP_X),
      height: Math.max(500, totalHeight),
      rows: rowHeights.length
    };
  }, [visibleTables]);

  const visibleNames = new Set(visibleTables.map((table) => table.name));
  const visibleRelations = relations.filter((relation) => visibleNames.has(relation.sourceTable) && visibleNames.has(relation.targetTable));
  const isDark = theme === 'dark';

  const palette = isDark
    ? { 
        canvas: '#070a12', 
        card: '#0e1322', 
        cardHover: '#131a30',
        stroke: '#1e293b', 
        strokeHover: '#3b82f6',
        title: '#f8fafc', 
        type: '#94a3b8', 
        row: '#111728', 
        key: '#f59e0b', 
        foreign: '#a855f7', 
        line: '#38bdf8', 
        lineMuted: '#1e293b',
        muted: '#64748b',
        headerBg: '#131b2e'
      }
    : { 
        canvas: '#f8fafc', 
        card: '#ffffff', 
        cardHover: '#f1f5f9',
        stroke: '#cbd5e1', 
        strokeHover: '#2563eb',
        title: '#0f172a', 
        type: '#64748b', 
        row: '#f8fafc', 
        key: '#d97706', 
        foreign: '#7c3aed', 
        line: '#0284c7', 
        lineMuted: '#e2e8f0',
        muted: '#64748b',
        headerBg: '#eff6ff'
      };

  if (visibleTables.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-slate-500 font-medium">
        No database tables or columns matched "{filterQuery}".
      </div>
    );
  }

  return (
    <div className="inline-block p-6 select-none" style={{ width: layout.width, height: layout.height }}>
      <svg
        width={layout.width}
        height={layout.height}
        className="block select-none shadow-sm rounded-2xl"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Interactive Database Schema ERD Diagram"
      >
        <defs>
          <pattern id="schema-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'} strokeWidth="1" />
          </pattern>
          <marker id="schema-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>
          <marker id="schema-arrow-default" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={palette.line} />
          </marker>
        </defs>

        <rect width="100%" height="100%" rx="20" fill={palette.canvas} />
        <rect width="100%" height="100%" rx="20" fill="url(#schema-grid-pattern)" />

        {/* Foreign Key Relationship Paths */}
        {visibleRelations.map((relation, index) => {
          const source = layout.positions.get(relation.sourceTable);
          const target = layout.positions.get(relation.targetTable);
          if (!source || !target) return null;

          const isConnectedToHovered = hoveredTable && (relation.sourceTable === hoveredTable || relation.targetTable === hoveredTable);
          const isDirectlyHovered = hoveredRelation === relation;

          const strokeColor = isDirectlyHovered || isConnectedToHovered ? '#38bdf8' : hoveredTable ? palette.lineMuted : palette.line;
          const strokeWidth = isDirectlyHovered || isConnectedToHovered ? 2.75 : 1.75;
          const opacity = isDirectlyHovered || isConnectedToHovered ? 1 : hoveredTable ? 0.2 : 0.75;

          const startsLeft = source.x > target.x;
          const startX = startsLeft ? source.x : source.x + NODE_WIDTH;
          const endX = startsLeft ? target.x + NODE_WIDTH : target.x;
          
          const sourceColIndex = (visibleTables.find(t => t.name === relation.sourceTable)?.columns || []).findIndex(c => c.name === relation.sourceColumn);
          const targetColIndex = (visibleTables.find(t => t.name === relation.targetTable)?.columns || []).findIndex(c => c.name === relation.targetColumn);

          const startY = source.y + 60 + Math.max(0, sourceColIndex) * ROW_HEIGHT;
          const endY = target.y + 60 + Math.max(0, targetColIndex) * ROW_HEIGHT;
          const curve = Math.max(54, Math.abs(endX - startX) * 0.45);
          const d = `M ${startX} ${startY} C ${startX + (startsLeft ? -curve : curve)} ${startY}, ${endX + (startsLeft ? curve : -curve)} ${endY}, ${endX} ${endY}`;

          // Midpoint for cardinality badge
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          return (
            <g 
              key={`${relation.label}-${index}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredRelation(relation)}
              onMouseLeave={() => setHoveredRelation(null)}
            >
              <path 
                d={d} 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth={strokeWidth} 
                opacity={opacity} 
                markerEnd={isDirectlyHovered || isConnectedToHovered ? "url(#schema-arrow-active)" : "url(#schema-arrow-default)"}
                strokeDasharray={isConnectedToHovered ? "6 3" : undefined}
                className="transition-all duration-200"
              />
              {/* Relationship Tooltip on line */}
              {(isDirectlyHovered || isConnectedToHovered) && (
                <g transform={`translate(${midX - 34}, ${midY - 10})`}>
                  <rect width="68" height="20" rx="6" fill={palette.card} stroke="#38bdf8" strokeWidth="1" />
                  <text x="34" y="14" fill="#38bdf8" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">
                    1 : N (FK)
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Database Table Nodes */}
        {visibleTables.map((table) => {
          const position = layout.positions.get(table.name);
          const columns = table.columns || [];
          const isHovered = hoveredTable === table.name;

          return (
            <g 
              key={table.name} 
              transform={`translate(${position.x} ${position.y})`}
              onMouseEnter={() => setHoveredTable(table.name)}
              onMouseLeave={() => setHoveredTable(null)}
              className="transition-transform duration-150"
            >
              {/* Table Container Box */}
              <rect 
                width={NODE_WIDTH} 
                height={position.height} 
                rx="16" 
                fill={isHovered ? palette.cardHover : palette.card} 
                stroke={isHovered ? palette.strokeHover : palette.stroke} 
                strokeWidth={isHovered ? 2 : 1.25} 
                className="transition-colors duration-150"
              />

              {/* Table Header Pill */}
              <rect width={NODE_WIDTH} height="48" rx="16" fill={palette.headerBg} />
              <rect y="32" width={NODE_WIDTH} height="16" fill={palette.headerBg} />

              {/* Table Title & Database Engine Subtext */}
              <text 
                x="18" 
                y="24" 
                fill={palette.title} 
                fontSize="14" 
                fontWeight="800" 
                fontFamily="JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {table.name}
              </text>
              <text 
                x="18" 
                y="40" 
                fill={palette.type} 
                fontSize="9" 
                fontWeight="600" 
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {table.databaseType || 'Relational SQL'} · {columns.length} columns
              </text>

              {/* Quick Blast Simulation Button Badge in Header */}
              {onSelectForImpact && (
                <g 
                  transform={`translate(${NODE_WIDTH - 64}, 14)`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectForImpact(table.name, 'table', 'table_name');
                  }}
                >
                  <rect 
                    width="50" 
                    height="20" 
                    rx="6" 
                    fill={isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)'} 
                    stroke="rgba(244, 63, 94, 0.35)" 
                    strokeWidth="1" 
                  />
                  <g transform="translate(7, 4)">
                    <path 
                      d="M5.5 1.5 L2 6.5 L5 6.5 L4 11 L9 5 L6 5 Z" 
                      fill="#f43f5e" 
                    />
                    <text 
                      x="14" 
                      y="9" 
                      fill="#f43f5e" 
                      fontSize="9" 
                      fontWeight="800" 
                      fontFamily="system-ui, sans-serif"
                    >
                      Blast
                    </text>
                  </g>
                </g>
              )}

              {/* Column Rows - ALL columns rendered with zero truncation */}
              {columns.map((column, index) => {
                const foreignKey = table.foreignKeys?.find((key) => key.column === column.name);
                const y = 66 + index * ROW_HEIGHT;
                const hasKey = column.isPrimaryKey || !!foreignKey;
                
                return (
                  <g key={column.name}>
                    <rect 
                      x="8" 
                      y={y - 14} 
                      width={NODE_WIDTH - 16} 
                      height="22" 
                      rx="6" 
                      fill={index % 2 === 0 ? palette.row : 'transparent'} 
                    />

                    {/* Key Badges (Pills on Left) */}
                    {column.isPrimaryKey && (
                      <g>
                        <rect 
                          x="14" 
                          y={y - 10} 
                          width="22" 
                          height="14" 
                          rx="4" 
                          fill={isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)"} 
                          stroke={palette.key} 
                          strokeWidth="0.75" 
                        />
                        <text x="25" y={y + 0.5} fill={palette.key} fontSize="8" fontWeight="800" textAnchor="middle" dominantBaseline="middle">
                          PK
                        </text>
                      </g>
                    )}

                    {!column.isPrimaryKey && foreignKey && (
                      <g>
                        <rect 
                          x="14" 
                          y={y - 10} 
                          width="22" 
                          height="14" 
                          rx="4" 
                          fill={isDark ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.15)"} 
                          stroke={palette.foreign} 
                          strokeWidth="0.75" 
                        />
                        <text x="25" y={y + 0.5} fill={palette.foreign} fontSize="8" fontWeight="800" textAnchor="middle" dominantBaseline="middle">
                          FK
                        </text>
                      </g>
                    )}
                    
                    {/* Column Name */}
                    <text 
                      x={hasKey ? 42 : 18} 
                      y={y + 1} 
                      fill={column.isPrimaryKey ? palette.key : foreignKey ? palette.foreign : palette.title} 
                      fontSize="11" 
                      fontWeight={hasKey ? '700' : '500'} 
                      fontFamily="JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
                      dominantBaseline="middle"
                    >
                      {column.name}
                    </text>

                    {/* Column Type on Far Right */}
                    <text 
                      x={NODE_WIDTH - 14} 
                      y={y + 1} 
                      fill={palette.type} 
                      fontSize="9" 
                      textAnchor="end" 
                      fontFamily="JetBrains Mono, ui-monospace, monospace"
                      dominantBaseline="middle"
                    >
                      {column.type}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
