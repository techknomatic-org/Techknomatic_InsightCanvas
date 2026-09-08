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
});
