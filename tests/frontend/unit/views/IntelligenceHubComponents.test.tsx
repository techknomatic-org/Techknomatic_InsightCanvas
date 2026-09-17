// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardFilterBar } from '../../../../src/views/IntelligenceHub/DashboardFilterBar';
import { KpiGrid } from '../../../../src/views/IntelligenceHub/KpiGrid';
import { FilterSpec, KpiSpec } from '../../../../src/views/IntelligenceHub/intelligenceTypes';

describe('Intelligence Hub UI Components', () => {
    describe('DashboardFilterBar', () => {
        const mockFilter: FilterSpec = {
            field: 'plant_name',
            label: 'Plant Name',
            table: 'plants',
            options: ['All', 'Bengaluru Plant', 'Chennai Plant', 'Pune Plant'],
            selected_value: 'All',
        };

        it('renders dashboard title and description correctly', () => {
            const handleFilterChange = vi.fn();
            render(
                <DashboardFilterBar
                    filter={mockFilter}
                    onFilterChange={handleFilterChange}
                    dashboardTitle="Manufacturing Executive Summary"
                    dashboardDescription="High-level production overview"
                />
            );

            expect(screen.getByText('Manufacturing Executive Summary')).toBeDefined();
            expect(screen.getByText('High-level production overview')).toBeDefined();
        });

        it('renders the filter slicer label and options', () => {
            const handleFilterChange = vi.fn();
            render(
                <DashboardFilterBar
                    filter={mockFilter}
                    onFilterChange={handleFilterChange}
                />
            );

            expect(screen.getAllByText(/Plant Name/i).length).toBeGreaterThan(0);
            expect(screen.getByText('All')).toBeDefined();
        });
    });

    describe('KpiGrid', () => {
        const mockKpis: KpiSpec[] = [
            {
                id: 'kpi_1',
                title: 'Total Revenue Generated',
                formatted_value: '$3.4M',
                raw_value: 3400000,
                subtitle: 'Total revenue across all production runs',
                comparison: 'vs. total production cost',
            },
            {
                id: 'kpi_2',
                title: 'Total Production Cost',
                formatted_value: '$2.39M',
                raw_value: 2390000,
                subtitle: 'Total cost of production output',
                comparison: 'share of revenue generated',
            },
            {
                id: 'kpi_3',
                title: 'Total Units Produced',
                formatted_value: '33.5K',
                raw_value: 33500,
                subtitle: 'Cumulative units manufactured',
                comparison: 'vs. units planned',
            },
            {
                id: 'kpi_4',
                title: 'Average Defect Rate',
                formatted_value: '1.2%',
                raw_value: 0.012,
                subtitle: 'Mean defect rate across inspections',
                comparison: 'quality benchmark tracking',
            },
        ];

        it('renders exactly 4 KPI cards with metrics and comparisons', () => {
            render(<KpiGrid kpis={mockKpis} />);

            expect(screen.getAllByText(/Total Revenue Generated/i).length).toBeGreaterThan(0);
            expect(screen.getByText('$3.4M')).toBeDefined();

            expect(screen.getAllByText(/Total Production Cost/i).length).toBeGreaterThan(0);
            expect(screen.getByText('$2.39M')).toBeDefined();

            expect(screen.getAllByText(/Total Units Produced/i).length).toBeGreaterThan(0);
            expect(screen.getByText('33.5K')).toBeDefined();

            expect(screen.getAllByText(/Average Defect Rate/i).length).toBeGreaterThan(0);
            expect(screen.getByText('1.2%')).toBeDefined();
        });

        it('handles N/A metric gracefully without crashing', () => {
            const kpisWithNA: KpiSpec[] = [
                {
                    id: 'kpi_na',
                    title: 'Empty Metric',
                    formatted_value: 'N/A',
                    raw_value: null,
                    subtitle: 'No records available',
                },
            ];

            render(<KpiGrid kpis={kpisWithNA} />);
            expect(screen.getAllByText(/Empty Metric/i).length).toBeGreaterThan(0);
            expect(screen.getByText('N/A')).toBeDefined();
        });
    });

    describe('Visual Substitution When No Data Available', () => {
        it('automatically changes empty visual to an alternative active visual with real data', async () => {
            const { sanitizeDashboardVisuals } = await import('../../../../src/views/IntelligenceHub/vegaSpecBuilder');
            const mockDashboard: any = {
                title: 'Test Dashboard',
                description: 'Dashboard with an empty visual',
                visualizations: [
                    {
                        id: 'viz_working',
                        title: 'Revenue by Product Line',
                        chart_type: 'bar',
                        x_field: 'product_line',
                        y_field: 'revenue',
                        data: [
                            { product_line: 'Electronics', revenue: 1000 },
                            { product_line: 'Mechanical', revenue: 2000 },
                        ],
                    },
                    {
                        id: 'viz_empty_donut',
                        title: 'Efficiency Rating Breakdown',
                        description: 'Donut chart showing distribution of efficiency ratings',
                        chart_type: 'donut',
                        x_field: 'efficiency_rating',
                        y_field: 'Count',
                        data: [], // empty!
                    },
                ],
            };

            const sanitized = sanitizeDashboardVisuals(mockDashboard);
            expect(sanitized).toBeDefined();
            const visuals = sanitized?.visualizations || [];
            expect(visuals[1].data.length).toBeGreaterThan(0);
            expect(visuals[1].title).not.toBe('Efficiency Rating Breakdown');
            expect(visuals[1].title).toContain('Overview');
        });
    });

    describe('ChatPanel Error Resilience', () => {
        it('renders safely when error is an Error object without throwing toLowerCase error', async () => {
            const { ChatPanel } = await import('../../../../src/views/IntelligenceHub/ChatPanel');
            const errorObj = new Error("The selected data contains HR and attendance, but lacks relation.");
            
            expect(() => {
                render(
                    <ChatPanel
                        messages={[]}
                        onSendMessage={vi.fn()}
                        loading={false}
                        error={errorObj as any}
                    />
                );
            }).not.toThrow();

            expect(screen.getAllByText(/The selected data contains HR and attendance/i).length).toBeGreaterThan(0);
        }, 15000);

        it('renders safely when error is an object with reason or detail', async () => {
            const { ChatPanel } = await import('../../../../src/views/IntelligenceHub/ChatPanel');
            const errorObj = {
                reason: "Rate limit reached for the requested model.",
                status: 429,
            };

            expect(() => {
                render(
                    <ChatPanel
                        messages={[]}
                        onSendMessage={vi.fn()}
                        loading={false}
                        error={errorObj as any}
                    />
                );
            }).not.toThrow();

            expect(screen.getAllByText(/Rate Limit Reached/i).length).toBeGreaterThan(0);
        }, 15000);
    });

    describe('Vega Spec Builder Number Formatting', () => {
        it('formats donut chart slice compact labels and tooltips with 2 decimals max', async () => {
            const { rebuildVegaSpec } = await import('../../../../src/views/IntelligenceHub/vegaSpecBuilder');
            const spec = rebuildVegaSpec(
                {
                    id: 'viz_donut_test',
                    chart_type: 'donut',
                    title: 'Leadership Scores by Department',
                    x_field: 'department_name',
                    y_field: 'leadership_score',
                    data: [
                        { department_name: 'Engineering', leadership_score: 72.4133333333 },
                        { department_name: 'HR', leadership_score: 2.6666666666 },
                    ],
                },
                'donut'
            );

            expect(spec).toBeDefined();
            // Check tooltip format has 2 decimals max
            const tooltip = (spec.encoding || (spec.layer && spec.layer[0].encoding))?.tooltip;
            const yTooltip = tooltip?.find((t: any) => t.field === 'leadership_score');
            expect(yTooltip?.format).toBe(',.2~f');

            // Check compact label transform uses ,.2~f
            const transform = spec.transform?.find((tr: any) => tr.as === 'leadership_score_compact_label');
            expect(transform?.calculate).toContain(',.2~f');
        });
    });
});

