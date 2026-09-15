// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { VisualizationSpec } from './intelligenceTypes';

export interface ChartThemePreset {
    id: string;
    label: string;
    primaryColor: string;
    palette: string[];
}

export const CHART_THEME_PRESETS: ChartThemePreset[] = [
    {
        id: 'techknomatic',
        label: 'Techknomatic Blue',
        primaryColor: '#1B75BB',
        palette: ['#1B75BB', '#00B4D8', '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'],
    },
    {
        id: 'emerald',
        label: 'Emerald Grove',
        primaryColor: '#10B981',
        palette: ['#10B981', '#059669', '#34D399', '#6EE7B7', '#047857', '#14B8A6', '#0D9488', '#2DD4BF'],
    },
    {
        id: 'violet',
        label: 'Indigo Violet',
        primaryColor: '#7C3AED',
        palette: ['#7C3AED', '#6366F1', '#8B5CF6', '#A78BFA', '#4F46E5', '#C084FC', '#9333EA', '#D8B4FE'],
    },
    {
        id: 'sunset',
        label: 'Sunset Coral',
        primaryColor: '#F43F5E',
        palette: ['#F43F5E', '#FB7185', '#E11D48', '#FB923C', '#F59E0B', '#FDA4AF', '#BE123C', '#F97316'],
    },
    {
        id: 'amber',
        label: 'Amber Gold',
        primaryColor: '#F59E0B',
        palette: ['#F59E0B', '#D97706', '#FBBF24', '#FCD34D', '#B45309', '#FB923C', '#EA580C', '#FEF08A'],
    },
    {
        id: 'ocean',
        label: 'Ocean Cyan',
        primaryColor: '#06B6D4',
        palette: ['#06B6D4', '#0891B2', '#22D3EE', '#67E8F9', '#0E7490', '#38BDF8', '#0284C7', '#A5F3FC'],
    },
    {
        id: 'slate',
        label: 'Slate Charcoal',
        primaryColor: '#475569',
        palette: ['#475569', '#334155', '#64748b', '#94a3b8', '#1e293b', '#0f172a', '#cbd5e1', '#6b7280'],
    },
    {
        id: 'vibrant',
        label: 'Vibrant Multi',
        primaryColor: '#EC4899',
        palette: ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'],
    },
];

export type SupportedChartType =
    | 'bar'
    | 'horizontal_bar'
    | 'line'
    | 'step_line'
    | 'area'
    | 'donut'
    | 'pie'
    | 'scatter'
    | 'dot_plot'
    | 'boxplot';

export interface SupportedChartTypeOption {
    type: SupportedChartType;
    label: string;
    description: string;
}

export const SUPPORTED_CHART_TYPES: SupportedChartTypeOption[] = [
    { type: 'bar', label: 'Bar Chart', description: 'Discrete vertical comparison' },
    { type: 'horizontal_bar', label: 'Horizontal Bar', description: 'Long labels comparison' },
    { type: 'line', label: 'Line Chart', description: 'Trends and changes over time' },
    { type: 'step_line', label: 'Step Line', description: 'Stepped metric progression' },
    { type: 'area', label: 'Area Chart', description: 'Volume and cumulative trends' },
    { type: 'donut', label: 'Donut Chart', description: 'Percentage and share breakdown' },
    { type: 'pie', label: 'Pie Chart', description: 'Proportional slice distribution' },
    { type: 'scatter', label: 'Scatter Plot', description: 'Correlation across data points' },
    { type: 'dot_plot', label: 'Dot Plot', description: 'Direct point benchmark comparison' },
    { type: 'boxplot', label: 'Box Plot', description: 'Distribution, median & quartiles' },
];

export function normalizeChartType(rawType?: string): SupportedChartType {
    const t = (rawType || 'bar').toLowerCase().trim().replace(/[-_\s]+/g, '_');
    if (t === 'column' || t === 'col' || t === 'bar' || t === 'vertical_bar') return 'bar';
    if (t === 'horizontal_bar' || t === 'hbar') return 'horizontal_bar';
    if (t === 'line' || t === 'spline' || t === 'trend' || t === 'timeseries') return 'line';
    if (t === 'step_line' || t === 'step' || t === 'stepline') return 'step_line';
    if (t === 'area') return 'area';
    if (t === 'donut' || t === 'doughnut') return 'donut';
    if (t === 'pie') return 'pie';
    if (t === 'scatter' || t === 'point') return 'scatter';
    if (t === 'dot_plot' || t === 'dot' || t === 'dotplot') return 'dot_plot';
    if (t === 'boxplot' || t === 'box_plot' || t === 'box' || t === 'candlestick') return 'boxplot';
    return 'bar';
}

/**
 * Rebuilds a Vega-Lite spec client-side with new chart type and/or theme color palette.
 */
export function rebuildVegaSpec(
    viz: VisualizationSpec,
    newChartType: SupportedChartType | string,
    themePreset: ChartThemePreset = CHART_THEME_PRESETS[0]
): any {
    // Deep-extract data from various Vega-Lite spec structures (flat, layered, concatenated)
    let records: Record<string, any>[] = [];
    if (Array.isArray(viz.data) && viz.data.length > 0) {
        records = viz.data;
    } else if (Array.isArray(viz.vega_spec?.data?.values) && viz.vega_spec.data.values.length > 0) {
        records = viz.vega_spec.data.values;
    } else if (Array.isArray(viz.vega_spec?.layer)) {
        // Layered specs: data may be at the layer level or in individual layers
        for (const layer of viz.vega_spec.layer) {
            if (Array.isArray(layer?.data?.values) && layer.data.values.length > 0) {
                records = layer.data.values;
                break;
            }
        }
    } else if (Array.isArray(viz.vega_spec?.hconcat)) {
        for (const sub of viz.vega_spec.hconcat) {
            if (Array.isArray(sub?.data?.values) && sub.data.values.length > 0) {
                records = sub.data.values;
                break;
            }
        }
    } else if (Array.isArray(viz.vega_spec?.vconcat)) {
        for (const sub of viz.vega_spec.vconcat) {
            if (Array.isArray(sub?.data?.values) && sub.data.values.length > 0) {
                records = sub.data.values;
                break;
            }
        }
    }

    const firstRow = records[0] || {};
    const availableKeys = Object.keys(firstRow);

    // Resolve exact field key from data records
    const resolveFieldKey = (candidate: string | null | undefined): string | null => {
        if (!candidate) return null;
        if (candidate in firstRow) return candidate;
        const cLower = candidate.toLowerCase().trim();
        for (const k of availableKeys) {
            if (k.toLowerCase().trim() === cLower) return k;
            if (k.toLowerCase().replace(/[_\s-]+/g, '') === cLower.replace(/[_\s-]+/g, '')) return k;
        }
        return candidate;
    };

    const rawX = viz.x_field || viz.vega_spec?.encoding?.x?.field || (availableKeys.length > 0 ? availableKeys[0] : null);
    const rawY = viz.y_field || viz.vega_spec?.encoding?.y?.field || (availableKeys.length > 1 ? availableKeys[1] : null);
    const rawColor = viz.color_field || viz.vega_spec?.encoding?.color?.field || null;

    const xField = resolveFieldKey(rawX);
    const yField = resolveFieldKey(rawY);
    const colorField = resolveFieldKey(rawColor);
    const chartTitle = viz.title || 'Visualization';
    const cType = normalizeChartType(newChartType);

    const primaryColor = themePreset.primaryColor;
    const colorPalette = themePreset.palette;

    // Dynamically detect if x-axis values are genuinely parseable as calendar dates.
    // We sample actual data values instead of relying on hardcoded column-name patterns,
    // so columns named "Month" with values like "January" are correctly treated as nominal
    // while columns with genuine ISO dates like "2024-01-15" remain temporal.
    const isTemporalValue = (val: any): boolean => {
        if (val == null || val === '') return false;
        if (val instanceof Date) return !isNaN(val.getTime());
        if (typeof val === 'number') return val >= 1e9; // Unix epoch threshold
        if (typeof val === 'string') {
            const trimmed = val.trim();
            // Pure small numbers (1, 2, 12, 100) are indices/categories, not dates
            if (/^\d{1,3}$/.test(trimmed)) return false;
            return !isNaN(Date.parse(trimmed));
        }
        return false;
    };

    const existingXType = viz.vega_spec?.encoding?.x?.type;
    // Sample up to 3 data values from the x-field to verify temporal parseability
    let dataIsTemporal = false;
    if (xField && records.length > 0) {
        const sampleSize = Math.min(records.length, 3);
        let validTemporalCount = 0;
        for (let i = 0; i < sampleSize; i++) {
            if (isTemporalValue(records[i]?.[xField])) {
                validTemporalCount++;
            }
        }
        // Consider temporal only if a majority of sampled values parse as valid dates
        dataIsTemporal = validTemporalCount > sampleSize / 2;
    }
    const isTemporal = existingXType === 'temporal' ? dataIsTemporal : dataIsTemporal;

    const formatTitle = (str: string) =>
        str.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Build tooltips
    const tooltip: any[] = [];
    if (xField) {
        tooltip.push({
            field: xField,
            type: isTemporal ? 'temporal' : 'nominal',
            title: formatTitle(xField),
        });
    }
    if (yField) {
        const yTitle = formatTitle(yField);
        const yLower = yField.toLowerCase();
        let format = '~s';
        if (/\b(rate|percent|percentage|pct|ratio|share|margin|efficiency|utilization)\b/.test(yLower)) {
            format = '.1%';
        } else if (/\b(cost|price|revenue|salary|wage|budget|spend|sales|income)\b/.test(yLower)) {
            format = '$,.2f';
        } else if (/\b(minutes?|duration_min|duration_minutes|wait_time|response_time)\b/.test(yLower)) {
            format = ',.0f';
        } else if (/\b(hours?|overtime|hours_worked|duration_hours?)\b/.test(yLower)) {
            format = ',.1f';
        }
        tooltip.push({
            field: yField,
            type: 'quantitative',
            title: yTitle,
            format,
        });
    }
    if (colorField && colorField !== xField && colorField !== yField) {
        tooltip.push({
            field: colorField,
            type: 'nominal',
            title: formatTitle(colorField),
        });
    }

    // Pie / Donut Charts (Arc with Layered Text)
    if (cType === 'donut' || cType === 'pie') {
        const topEncoding: any = {
            theta: yField ? { field: yField, type: 'quantitative', stack: true } : undefined,
            color: xField
                ? {
                      field: xField,
                      type: 'nominal',
                      scale: { range: colorPalette },
                      legend: { orient: 'bottom', columns: 3, labelFontSize: 11, title: null },
                  }
                : { value: primaryColor },
            tooltip: tooltip.length > 0 ? tooltip : undefined,
        };

        const arcLayer: any = {
            mark: {
                type: 'arc',
                innerRadius: cType === 'donut' ? 45 : 0,
                outerRadius: 80,
                padAngle: 0.03,
                cornerRadius: 4,
            },
        };

        const textLayer: any = {
            mark: {
                type: 'text',
                radius: cType === 'donut' ? 62 : 52,
                fontSize: 11,
                fontWeight: 700,
                fill: '#ffffff',
            },
            encoding: {
                text: yField ? { field: yField, type: 'quantitative', format: '~s' } : undefined,
            },
        };

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: {
                text: chartTitle,
                anchor: 'start',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
            },
            width: 'container',
            height: 220,
            data: { values: records },
            encoding: topEncoding,
            layer: [arcLayer, textLayer],
            config: {
                view: { stroke: 'transparent' },
                font: 'Inter, Roboto, sans-serif',
                axis: { domainColor: '#e2e8f0', tickColor: '#e2e8f0' },
            },
        };
    }

    // Horizontal Bar Chart: swap X and Y
    if (cType === 'horizontal_bar') {
        const yTitle = yField ? formatTitle(yField) : 'Value';
        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: {
                text: chartTitle,
                anchor: 'start',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
            },
            width: 'container',
            height: 220,
            data: { values: records },
            mark: {
                type: 'bar',
                cornerRadiusEnd: 6,
                color: primaryColor,
            },
            encoding: {
                y: xField
                    ? {
                          field: xField,
                          type: 'nominal',
                          axis: {
                              labelLimit: 120,
                              labelColor: '#64748b',
                              tickColor: '#cbd5e1',
                              domainColor: '#cbd5e1',
                              title: null,
                          },
                      }
                    : undefined,
                x: yField
                    ? {
                          field: yField,
                          type: 'quantitative',
                          axis: {
                              grid: true,
                              gridColor: '#f1f5f9',
                              gridDash: [3, 3],
                              domainColor: 'transparent',
                              tickColor: 'transparent',
                              labelColor: '#94a3b8',
                              title: yTitle,
                              titleColor: '#64748b',
                              titleFontSize: 11,
                          },
                      }
                    : undefined,
                color: colorField
                    ? {
                          field: colorField,
                          type: 'nominal',
                          scale: { range: colorPalette },
                          legend: colorField === xField ? null : { orient: 'bottom', columns: 3, labelFontSize: 11, title: null },
                      }
                    : { value: primaryColor },
                tooltip: tooltip.length > 0 ? tooltip : undefined,
            },
            config: {
                view: { stroke: 'transparent' },
                font: 'Inter, Roboto, sans-serif',
                range: { category: colorPalette },
                axis: { domainColor: '#e2e8f0', tickColor: '#e2e8f0' },
            },
        };
    }

    // Box Plot
    if (cType === 'boxplot') {
        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: {
                text: chartTitle,
                anchor: 'start',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
            },
            width: 'container',
            height: 220,
            data: { values: records },
            mark: {
                type: 'boxplot',
                extent: 'min-max',
                size: 26,
                color: primaryColor,
            },
            encoding: {
                x: xField ? { field: xField, type: 'nominal', axis: { title: null } } : undefined,
                y: yField ? { field: yField, type: 'quantitative', axis: { title: yField } } : undefined,
                color: colorField
                    ? { field: colorField, type: 'nominal', scale: { range: colorPalette } }
                    : { value: primaryColor },
                tooltip: tooltip.length > 0 ? tooltip : undefined,
            },
            config: {
                view: { stroke: 'transparent' },
                font: 'Inter, Roboto, sans-serif',
                range: { category: colorPalette },
                axis: { domainColor: '#e2e8f0', tickColor: '#e2e8f0' },
            },
        };
    }

    // Mark definition for standard 2D charts
    let mark: any = 'bar';
    if (cType === 'bar') {
        mark = {
            type: 'bar',
            cornerRadiusEnd: 6,
            color: primaryColor,
        };
    } else if (cType === 'line') {
        mark = {
            type: 'line',
            interpolate: 'monotone',
            strokeWidth: 2.5,
            color: primaryColor,
            point: { filled: true, size: 36, fill: primaryColor },
        };
    } else if (cType === 'step_line') {
        mark = {
            type: 'line',
            interpolate: 'step-after',
            strokeWidth: 2.5,
            color: primaryColor,
            point: { filled: true, size: 36, fill: primaryColor },
        };
    } else if (cType === 'area') {
        mark = {
            type: 'area',
            interpolate: 'monotone',
            opacity: 0.28,
            color: primaryColor,
            line: { color: primaryColor, width: 2.5 },
        };
    } else if (cType === 'scatter') {
        mark = {
            type: 'point',
            size: 60,
            filled: true,
            opacity: 0.8,
            color: primaryColor,
        };
    } else if (cType === 'dot_plot') {
        mark = {
            type: 'point',
            size: 80,
            filled: true,
            opacity: 0.95,
            color: primaryColor,
        };
    }

    const encoding: any = {};
    if (xField) {
        if (isTemporal) {
            encoding.x = {
                field: xField,
                type: 'temporal',
                axis: {
                    format: '%b %Y',
                    labelAngle: -30,
                    labelLimit: 110,
                    labelColor: '#64748b',
                    tickColor: '#cbd5e1',
                    domainColor: '#cbd5e1',
                    title: null,
                },
            };
        } else {
            encoding.x = {
                field: xField,
                type: 'nominal',
                sort: null, // Preserve original data order from backend query
                axis: {
                    labelAngle: records.length > 6 ? -30 : 0,
                    labelLimit: 90,
                    labelColor: '#64748b',
                    tickColor: '#cbd5e1',
                    domainColor: '#cbd5e1',
                    title: null,
                },
            };
        }
    }

    if (yField) {
        const yTitle = formatTitle(yField);
        encoding.y = {
            field: yField,
            type: 'quantitative',
            axis: {
                grid: true,
                gridColor: '#f1f5f9',
                gridDash: [3, 3],
                domainColor: 'transparent',
                tickColor: 'transparent',
                labelColor: '#94a3b8',
                title: yTitle,
                titleColor: '#64748b',
                titleFontSize: 11,
            },
        };
    }

    if (colorField) {
        encoding.color = {
            field: colorField,
            type: 'nominal',
            scale: { range: colorPalette },
            legend: colorField === xField ? null : { orient: 'bottom', columns: 3, labelFontSize: 11, title: null },
        };
    } else {
        encoding.color = { value: primaryColor };
    }

    if (tooltip.length > 0) {
        encoding.tooltip = tooltip;
    }

    return {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        title: {
            text: chartTitle,
            anchor: 'start',
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
        },
        width: 'container',
        height: 220,
        data: { values: records },
        mark,
        encoding,
        config: {
            view: { stroke: 'transparent' },
            font: 'Inter, Roboto, sans-serif',
            range: {
                category: colorPalette,
            },
            axis: { domainColor: '#e2e8f0', tickColor: '#e2e8f0' },
        },
    };
}
