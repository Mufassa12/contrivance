import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { Box, Typography, Paper } from '@mui/material';
import { DiscoveryResponse } from '../services/DiscoveryService';

interface SankeyProps {
  findings: DiscoveryResponse[];
  title?: string;
}

interface SankeyNode {
  name: string;
  category?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const DiscoverySankey: React.FC<SankeyProps> = ({ findings, title = 'Technology Stack Flow' }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!findings.length || !svgRef.current) return;

    // Build sankey data from findings
    const data = buildSankeyData(findings);
    
    // Render sankey diagram
    renderSankey(svgRef.current, data);
  }, [findings]);

  const buildSankeyData = (findings: DiscoveryResponse[]): SankeyData => {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap = new Map<string, number>();

    // Helper to get or create node
    const getNodeIndex = (name: string, category?: string): number => {
      const key = `${category || 'general'}:${name}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, nodes.length);
        nodes.push({ name, category });
      }
      return nodeMap.get(key)!;
    };

    // Process findings
    findings.forEach((finding) => {
      const category = getCategory(finding.question_id);
      const categoryIndex = getNodeIndex(category, 'category');

      if (finding.question_type === 'vendor_multi' && finding.vendor_selections) {
        // Extract vendors from vendor_selections
        Object.entries(finding.vendor_selections).forEach(([subcategory, vendors]) => {
          if (Array.isArray(vendors)) {
            vendors.forEach((vendor) => {
              const vendorIndex = getNodeIndex(vendor, 'vendor');
              
              // Check if link already exists
              const existingLink = links.find(
                (l) => l.source === categoryIndex && l.target === vendorIndex
              );
              
              if (existingLink) {
                existingLink.value += 1;
              } else {
                links.push({
                  source: categoryIndex,
                  target: vendorIndex,
                  value: 1,
                });
              }
            });
          }
        });
      } else if (finding.question_type === 'multi_select' && Array.isArray(finding.response_value)) {
        // For multi_select, create nodes for each selection
        finding.response_value.forEach((value) => {
          const valueIndex = getNodeIndex(value, 'selection');
          
          const existingLink = links.find(
            (l) => l.source === categoryIndex && l.target === valueIndex
          );
          
          if (existingLink) {
            existingLink.value += 1;
          } else {
            links.push({
              source: categoryIndex,
              target: valueIndex,
              value: 1,
            });
          }
        });
      }
    });

    return { nodes, links };
  };

  const getCategory = (questionId: string): string => {
    if (questionId.includes('security')) return 'Security';
    if (questionId.includes('cloud') || questionId.includes('infrastructure')) return 'Infrastructure';
    if (questionId.includes('dev') || questionId.includes('programming')) return 'Development';
    if (questionId.includes('data') || questionId.includes('analytics')) return 'Data';
    if (questionId.includes('ai') || questionId.includes('llm')) return 'AI/LLM';
    return 'Other';
  };

  const renderSankey = (container: SVGSVGElement, data: SankeyData) => {
    // Clear previous content
    d3.select(container).selectAll('*').remove();

    // Color scheme for categories
    const categoryColors: Record<string, string> = {
      'Security': '#e74c3c',
      'Infrastructure': '#3498db',
      'Development': '#2ecc71',
      'Data': '#f39c12',
      'AI/LLM': '#9b59b6',
      'Other': '#95a5a6'
    };

    // Dimensions
    const width = Math.max(container.clientWidth || 1200, 1200);
    const height = Math.max(800, data.nodes.length * 20);
    const margin = { top: 30, right: 350, bottom: 30, left: 350 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(container)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create sankey generator
    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(20)
      .nodePadding(60)
      .extent([
        [margin.left, margin.top],
        [innerWidth + margin.left, innerHeight + margin.top],
      ]);

    // Generate sankey layout
    const { nodes: layoutNodes, links: layoutLinks } = sankeyGenerator({
      nodes: data.nodes.map((d) => ({ ...d })),
      links: data.links.map((d) => ({ ...d })),
    });

    // Create main group
    const g = svg.append('g');

    // Create gradient definitions for links
    const defs = svg.append('defs');
    
    // Prepare per-vendor color scale
    const vendorNames = data.nodes.filter(n => n.category === 'vendor').map(n => n.name);
    const vendorColor = d3.scaleOrdinal<string, string>(d3.schemeTableau10 as any).domain(vendorNames as any);

    // Create gradient definitions for links (use source color as base)
    layoutLinks.forEach((link: any, i: number) => {
      const sourceNode = typeof link.source === 'object' ? link.source : layoutNodes[link.source];
      let sourceColor = categoryColors['Other'];
      if (sourceNode) {
        if (sourceNode.category === 'category') sourceColor = categoryColors[sourceNode.name] || categoryColors['Other'];
        else if (sourceNode.category === 'vendor') sourceColor = vendorColor(sourceNode.name);
      }

      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('x1', '0%')
        .attr('x2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', sourceColor)
        .attr('stop-opacity', 0.95);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', sourceColor)
        .attr('stop-opacity', 0.7);
    });

    // Calculate max link width so we can scale stroke widths for visibility
    const maxLinkWidth = d3.max(layoutLinks as any, (l: any) => l.width) || 1;

    // Draw links with gradients, scale width relative to max
    g.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(layoutLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal() as any)
      .attr('stroke', (d: any, i: number) => `url(#gradient-${i})`)
      .attr('stroke-opacity', 0.95)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
  .attr('stroke-width', (d: any) => Math.max(2, (Number(d.width) / Number(maxLinkWidth)) * 28));

    // Draw nodes
    const nodeGroups = g
      .append('g')
      .selectAll('g')
      .data(layoutNodes)
      .join('g')
      .attr('transform', (d: any) => {
        if (d.x === undefined || d.y === undefined) return 'translate(0,0)';
        return `translate(${d.x},${d.y})`;
      });

    // Add rectangles for nodes
    nodeGroups
      .append('rect')
      .attr('height', (d: any) => Math.max(1, (d.y1 || 0) - (d.y0 || 0)))
      .attr('width', 20)
      .attr('fill', (d: any) => {
        if (d.category === 'category') {
          return categoryColors[d.name] || categoryColors['Other'];
        } else if (d.category === 'vendor') {
          return '#ecf0f1';
        } else {
          return '#bdc3c7';
        }
      })
      .attr('stroke', (d: any) => {
        const sourceNode = d;
        if (sourceNode?.category === 'category') {
          return categoryColors[sourceNode.name] || categoryColors['Other'];
        }
        return '#34495e';
      })
      .attr('stroke-width', 2);

    // Add labels with better visibility
    nodeGroups
      .append('text')
      .attr('x', (d: any) => {
        if (d.x0 === undefined) return 0;
        return d.x0 < innerWidth / 2 ? 30 : -30;
      })
      .attr('y', (d: any) => ((d.y1 || 0) - (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => {
        if (d.x0 === undefined) return 'start';
        return d.x0 < innerWidth / 2 ? 'start' : 'end';
      })
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#2c3e50')
      .text((d: any) => d.name || '')
      .style('pointer-events', 'none')
      .style('user-select', 'none');
  };

  return (
    <Paper sx={{ p: 2, mb: 3, width: '100%', overflow: 'auto' }}>
      {title && <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>}
      <Box sx={{ width: '100%', minHeight: 600, display: 'flex', justifyContent: 'center' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#e74c3c' }} />
          <Typography variant="caption">Security</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#3498db' }} />
          <Typography variant="caption">Infrastructure</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#2ecc71' }} />
          <Typography variant="caption">Development</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#f39c12' }} />
          <Typography variant="caption">Data</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#9b59b6' }} />
          <Typography variant="caption">AI/LLM</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#ecf0f1', border: '1px solid #34495e' }} />
          <Typography variant="caption">Vendor</Typography>
        </Box>
      </Box>
    </Paper>
  );
};
