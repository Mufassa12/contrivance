import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box, Typography, Paper } from '@mui/material';
import { DiscoveryResponse } from '../services/DiscoveryService';

interface SunburstProps {
  findings: DiscoveryResponse[];
  accountName?: string;
  title?: string;
}

interface HierarchyNode {
  name: string;
  category?: string;
  value?: number;
  children?: HierarchyNode[];
}

export const DiscoverySunburst: React.FC<SunburstProps> = ({
  findings,
  accountName = 'Account',
  title = 'Discovery Overview',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!findings.length || !svgRef.current) return;

    // Build hierarchical data
    const hierarchyData = buildHierarchyData(findings, accountName);

    // Render sunburst
    renderSunburst(svgRef.current, hierarchyData);
  }, [findings, accountName]);

  const buildHierarchyData = (findings: DiscoveryResponse[], account: string): HierarchyNode => {
    const categoryMap = new Map<string, Map<string, number>>();

    // Initialize categories
    const categories = ['Security', 'Infrastructure', 'Development', 'Data', 'AI/LLM'];
    categories.forEach((cat) => {
      categoryMap.set(cat, new Map());
    });

    // Process findings
    findings.forEach((finding) => {
      const category = getCategory(finding.question_id);
      const techMap = categoryMap.get(category) || new Map();

      if (finding.question_type === 'vendor_multi' && finding.vendor_selections) {
        // Extract vendors from vendor_selections
        Object.entries(finding.vendor_selections).forEach(([_, vendors]) => {
          if (Array.isArray(vendors)) {
            vendors.forEach((vendor) => {
              techMap.set(vendor, (techMap.get(vendor) || 0) + 1);
            });
          }
        });
      } else if (finding.question_type === 'multi_select' && Array.isArray(finding.response_value)) {
        // For multi_select, add each selection
        finding.response_value.forEach((value) => {
          techMap.set(value, (techMap.get(value) || 0) + 1);
        });
      }

      categoryMap.set(category, techMap);
    });

    // Build hierarchy
    const root: HierarchyNode = {
      name: account,
      category: 'root',
      children: [],
    };

    categories.forEach((category) => {
      const techMap = categoryMap.get(category) || new Map();
      if (techMap.size > 0) {
        const categoryNode: HierarchyNode = {
          name: category,
          category: 'category',
          children: Array.from(techMap.entries()).map(([tech, count]) => ({
            name: tech,
            category: 'technology',
            value: count,
          })),
        };
        root.children!.push(categoryNode);
      }
    });

    return root;
  };

  const getCategory = (questionId: string): string => {
    if (questionId.includes('security')) return 'Security';
    if (questionId.includes('cloud') || questionId.includes('infrastructure')) return 'Infrastructure';
    if (questionId.includes('dev') || questionId.includes('programming')) return 'Development';
    if (questionId.includes('data') || questionId.includes('analytics')) return 'Data';
    if (questionId.includes('ai') || questionId.includes('llm')) return 'AI/LLM';
    return 'Other';
  };

  const renderSunburst = (container: SVGSVGElement, data: HierarchyNode) => {
    // Clear previous content
    d3.select(container).selectAll('*').remove();

    // Color scale for categories
    const categoryColors: Record<string, string> = {
      Security: '#e74c3c',
      Infrastructure: '#3498db',
      Development: '#2ecc71',
      Data: '#f39c12',
      'AI/LLM': '#9b59b6',
      Other: '#95a5a6',
    };

    // Dimensions
    const width = Math.max(container.clientWidth || 900, 900);
    const height = Math.max(900, width);
    const radius = Math.min(width, height) / 2 - 20;

    // Create SVG
    const svg = d3
      .select(container)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`);

    // Create a tooltip div
    const tooltip = d3.select(container.parentElement)
      .append('div')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('display', 'none')
      .style('z-index', '1000')
      .style('white-space', 'nowrap');

    // Create hierarchy
    const hierarchy = d3.hierarchy(data)
      .sum((d) => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius]);
    const root = partition(hierarchy) as any;

    // Create arc generator
    const arc = d3.arc<any>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1);

    // Create main group
    const g = svg.append('g');

    // Draw slices
    const slices = g
      .selectAll('path')
      .data(root.descendants())
      .join('path')
      .attr('d', arc)
      .attr('fill', (d: any) => {
        if (d.depth === 0) return '#fff'; // Root (white)
        if (d.depth === 1) {
          // Categories
          return categoryColors[d.data.name] || categoryColors['Other'];
        }
        // Technologies - lighter shade of parent category color
        const parentName = d.parent?.data.name || 'Other';
        const baseColor = categoryColors[parentName] || categoryColors['Other'];
        return d3.color(baseColor)?.brighter(1.5).toString() || '#ecf0f1';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', (d: any) => (d.children ? 'pointer' : 'default'))
      .on('mouseenter', function (event, d: any) {
        d3.select(this).attr('stroke-width', 3).attr('stroke', '#333');

        // Show tooltip
        const label =
          d.depth === 0
            ? d.data.name
            : d.depth === 1
              ? `${d.data.name} (${d.children?.length || 0} technologies)`
              : `${d.data.name} (count: ${d.data.value || 0})`;

        tooltip
          .style('display', 'block')
          .text(label)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseleave', function (event, d: any) {
        d3.select(this).attr('stroke-width', 2).attr('stroke', '#fff');
        tooltip.style('display', 'none');
      })
      .on('click', (event, d: any) => {
        event.stopPropagation();
        // Optional: Implement zoom on click for deeper exploration
      });

    // Add labels
    const labels = g
      .selectAll('text')
      .data(root.descendants())
      .join('text')
      .attr('transform', (d: any) => {
        const x0 = d.x0;
        const x1 = d.x1;
        const y0 = d.y0;
        const y1 = d.y1;
        const angle = (x0 + x1) / 2;
        const radius_label = (y0 + y1) / 2;

        return `rotate(${(angle * 180) / Math.PI - 90}) translate(${radius_label},0)`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => {
        const angle = (d.x0 + d.x1) / 2;
        return angle > Math.PI ? 'end' : 'start';
      })
      .attr('transform', (d: any) => {
        const x0 = d.x0;
        const x1 = d.x1;
        const y0 = d.y0;
        const y1 = d.y1;
        const angle = (x0 + x1) / 2;
        const radius_label = (y0 + y1) / 2;

        const rotate = (angle * 180) / Math.PI - 90;
        const flip = angle > Math.PI ? 180 : 0;
        return `rotate(${rotate}) translate(${radius_label},0) rotate(${flip})`;
      })
      .style('font-size', (d: any) => {
        if (d.depth === 0) return '0px'; // Hide root label
        if (d.depth === 1) return '14px';
        return '10px';
      })
      .style('font-weight', (d: any) => (d.depth === 1 ? 'bold' : 'normal'))
      .style('fill', (d: any) => {
        if (d.depth === 1) return '#fff';
        return '#333';
      })
      .style('pointer-events', 'none')
      .text((d: any) => {
        if (d.depth === 0) return '';
        if (d.depth === 1) return d.data.name;
        // For technology level, show name if room, else truncate
        return d.data.name.length > 15 ? d.data.name.slice(0, 12) + '…' : d.data.name;
      });

    // Clean up tooltip on container mouseout
    svg.on('mouseleave', () => {
      tooltip.style('display', 'none');
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 3, width: '100%', position: 'relative' }}>
      {title && <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>}
      <Box sx={{ width: '100%', minHeight: 900, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '900px',
          }}
        />
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
      </Box>
    </Paper>
  );
};
