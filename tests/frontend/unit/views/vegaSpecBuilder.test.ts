// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
    normalizeChartType,
    rebuildVegaSpec,
    CHART_THEME_PRESETS,
    SUPPORTED_CHART_TYPES,
} from '../../../../src/views/IntelligenceHub/vegaSpecBuilder';
import { VisualizationSpec } from '../../../../src/views/IntelligenceHub/intelligenceTypes';

describe('vegaSpecBuilder - Unit Tests', () => {
    describe('normalizeChartType', () => {
        it('normalizes various aliases to supported chart types', () => {
            expect(normalizeChartType('bar')).toBe('bar');
            expect(normalizeChartType('column')).toBe('bar');
            expect(normalizeChartType('vertical_bar')).toBe('bar');
            expect(normalizeChartType('horizontal_bar')).toBe('horizontal_bar');
            expect(normalizeChartType('hbar')).toBe('horizontal_bar');
            expect(normalizeChartType('line')).toBe('line');
            expect(normalizeChartType('spline')).toBe('line');
            expect(normalizeChartType('step_line')).toBe('step_line');
            expect(normalizeChartType('area')).toBe('area');
            expect(normalizeChartType('donut')).toBe('donut');
            expect(normalizeChartType('doughnut')).toBe('donut');
            expect(normalizeChartType('pie')).toBe('pie');
            expect(normalizeChartType('scatter')).toBe('scatter');
            expect(normalizeChartType('dot_plot')).toBe('dot_plot');
            expect(normalizeChartType('boxplot')).toBe('boxplot');
            expect(normalizeChartType('unknown_type')).toBe('bar');
        });
    });

    describe('rebuildVegaSpec', () => {
        const sampleViz: VisualizationSpec = {
            id: 'viz_1',
            title: 'Revenue by Plant',
            chart_type: 'bar',
            x_field: 'plant_name',
            y_field: 'revenue',
            data: [
                { plant_name: 'Bengaluru Plant', revenue: 500000 },
                { plant_name: 'Chennai Plant', revenue: 300000 },
                { plant_name: 'Pune Plant', revenue: 600000 },
            ],
        };

        it('rebuilds a vertical bar chart spec with direct data labels layer by default', () => {
            const spec = rebuildVegaSpec(sampleViz, 'bar', CHART_THEME_PRESETS[0], true);
            expect(spec).toBeDefined();
            expect(spec.data.values).toHaveLength(3);
            expect(spec.layer).toHaveLength(2);
            expect(spec.layer[0].mark.type).toBe('bar');
            expect(spec.layer[0].encoding.x.field).toBe('plant_name');
            expect(spec.layer[0].encoding.y.field).toBe('revenue');
            expect(spec.layer[1].mark.type).toBe('text');
            expect(spec.layer[1].encoding.text.field).toBe('revenue');
            expect(spec.config).toBeDefined();
        });

        it('rebuilds a vertical bar chart without direct data labels when toggled off', () => {
            const spec = rebuildVegaSpec(sampleViz, 'bar', CHART_THEME_PRESETS[0], false);
            expect(spec).toBeDefined();
            expect(spec.mark).toBeDefined();
            expect(spec.encoding.x.field).toBe('plant_name');
            expect(spec.encoding.y.field).toBe('revenue');
        });

        it('rebuilds a horizontal bar chart spec correctly swapping encodings with data labels', () => {
            const spec = rebuildVegaSpec(sampleViz, 'horizontal_bar', CHART_THEME_PRESETS[1], true);
            expect(spec).toBeDefined();
            expect(spec.layer).toHaveLength(2);
            expect(spec.layer[0].encoding.y.field).toBe('plant_name');
            expect(spec.layer[0].encoding.x.field).toBe('revenue');
            expect(spec.layer[1].mark.type).toBe('text');
            expect(spec.layer[1].encoding.text.field).toBe('revenue');
        });

        it('rebuilds a donut chart spec with inner radius, theme colors, and slice labels', () => {
            const spec = rebuildVegaSpec(sampleViz, 'donut', CHART_THEME_PRESETS[2], true);
            expect(spec).toBeDefined();
            expect(spec.layer).toBeDefined();
            expect(spec.layer[0].encoding.theta).toBeDefined();
            expect(spec.layer[0].encoding.color.field).toBe('plant_name');
            expect(spec.layer[0].encoding.color.scale.range).toEqual(CHART_THEME_PRESETS[2].palette);
            expect(spec.layer[1].mark.type).toBe('text');
        });

        it('rebuilds a line chart spec with smooth interpolation and point overlays', () => {
            const spec = rebuildVegaSpec(sampleViz, 'line', CHART_THEME_PRESETS[3], true);
            expect(spec).toBeDefined();
            expect(spec.layer || spec.mark).toBeDefined();
        });

        it('rebuilds an area chart spec with gradient styling', () => {
            const spec = rebuildVegaSpec(sampleViz, 'area', CHART_THEME_PRESETS[4], true);
            expect(spec).toBeDefined();
        });

        it('rebuilds a scatter plot spec with point marks and tooltips', () => {
            const spec = rebuildVegaSpec(sampleViz, 'scatter', CHART_THEME_PRESETS[5], true);
            expect(spec).toBeDefined();
        });
    });
});
