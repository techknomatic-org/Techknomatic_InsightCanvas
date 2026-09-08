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
    themePreset: ChartThemePreset = CHART_THEME_PRESETS[0],
    showDataLabels?: boolean
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

    const shouldShowLabels = showDataLabels !== undefined ? showDataLabels : (viz.show_data_labels ?? true);

    const primaryColor = themePreset.primaryColor;
    const colorPalette = themePreset.palette;

    // Detect if x-axis field values are raw ISO date strings / Date objects vs pre-formatted strings (e.g. 'Jan 2020', 'Feb 2020')
    const sampleVal = firstRow && xField ? firstRow[xField] : null;
    const isIsoDate = typeof sampleVal === 'string' && /^\d{4}-\d{2}(-\d{2})?/.test(sampleVal.trim());
    const isDateObj = sampleVal instanceof Date;
    // Vega-Lite only parses 'temporal' properly if values are raw ISO timestamps (YYYY-MM-DD) or Date objects.
    // Pre-formatted strings (e.g. 'Jan 2020', 'Feb 2020', 'Q1 2023') MUST use 'ordinal' / 'nominal'
    // to prevent Vega-Lite date parsing failure (which produces NaN and renders an empty chart).
    const useVegaTemporal = isIsoDate || isDateObj;
    const xEncodingType = useVegaTemporal ? 'temporal' : (cType === 'line' || cType === 'area' || cType === 'step_line' ? 'ordinal' : 'nominal');

    const formatTitle = (str: string) =>
        str.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Determine smart data label format based on field semantics
    const yLower = (yField || '').toLowerCase();
    let labelFormat = '~s';
    if (/\b(rate|percent|percentage|pct|ratio|share|margin|efficiency|utilization)\b/.test(yLower)) {
        labelFormat = '.1%';
    } else if (/\b(cost|price|revenue|salary|wage|budget|spend|sales|income|fee|fees)\b/.test(yLower)) {
        labelFormat = '$~s';
    } else if (/\b(minutes?|duration_min|duration_minutes|wait_time|response_time)\b/.test(yLower)) {
        labelFormat = ',.0f';
    } else if (/\b(hours?|overtime|hours_worked|duration_hours?)\b/.test(yLower)) {
        labelFormat = ',.1f';
    }

    // Build tooltips
    const tooltip: any[] = [];
    if (xField) {
        tooltip.push({
            field: xField,
            type: xEncodingType,
            title: formatTitle(xField),
        });
    }
    if (yField) {
        const yTitle = formatTitle(yField);
        tooltip.push({
            field: yField,
            type: 'quantitative',
            title: yTitle,
            format: labelFormat === '$~s' ? '$,.2f' : labelFormat,
        });
    }
    if (colorField && colorField !== xField && colorField !== yField) {
        tooltip.push({
            field: colorField,
            type: 'nominal',
            title: formatTitle(colorField),
        });
    }

    const commonConfig: any = {
        view: { stroke: 'transparent' },
        font: 'Inter, Roboto, sans-serif',
        range: { category: colorPalette },
        axis: { domainColor: '#e2e8f0', tickColor: '#e2e8f0' },
    };

    // 1. Pie / Donut Charts (Arc with Layered Direct Labels)
    if (cType === 'donut' || cType === 'pie') {
        const arcLayer: any = {
            mark: {
                type: 'arc',
                innerRadius: cType === 'donut' ? 45 : 0,
                outerRadius: 80,
                padAngle: 0.03,
                cornerRadius: 4,
            },
            encoding: {
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
            },
        };

        const textLayer: any = {
            mark: {
                type: 'text',
                radius: cType === 'donut' ? 63 : 52,
                fontSize: 11,
                fontWeight: 700,
                fill: '#ffffff',
            },
            encoding: {
                theta: yField ? { field: yField, type: 'quantitative', stack: true } : undefined,
                detail: xField ? { field: xField, type: 'nominal' } : undefined,
                text: yField ? { field: yField, type: 'quantitative', format: labelFormat } : undefined,
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
            layer: shouldShowLabels ? [arcLayer, textLayer] : [arcLayer],
            config: commonConfig,
        };
    }

    // 2. Horizontal Bar Chart: swap X and Y with Direct Value Labels
    if (cType === 'horizontal_bar') {
        const yTitle = yField ? formatTitle(yField) : 'Value';
        const barLayer: any = {
            mark: {
                type: 'bar',
                cornerRadiusEnd: 6,
                color: colorField ? undefined : primaryColor,
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
                    : undefined,
                tooltip: tooltip.length > 0 ? tooltip : undefined,
            },
        };

        if (shouldShowLabels && yField) {
            const labelLayer: any = {
                mark: {
                    type: 'text',
                    align: 'left',
                    baseline: 'middle',
                    dx: 5,
                    fontSize: 10,
                    fontWeight: 700,
                    fill: '#334155',
                },
                encoding: {
                    y: xField ? { field: xField, type: 'nominal' } : undefined,
                    x: { field: yField, type: 'quantitative' },
                    text: { field: yField, type: 'quantitative', format: labelFormat },
                },
            };
            return {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
                title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
                width: 'container',
                height: 220,
                data: { values: records },
                layer: [barLayer, labelLayer],
                config: commonConfig,
            };
        }

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
            width: 'container',
            height: 220,
            data: { values: records },
            ...barLayer,
            config: commonConfig,
        };
    }

    // 3. Box Plot
    if (cType === 'boxplot') {
        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
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
            config: commonConfig,
        };
    }

    // Base Encodings for Standard 2D Charts (Bar, Line, Area, Scatter, Dot Plot)
    const baseEncoding: any = {};
    if (xField) {
        if (useVegaTemporal) {
            baseEncoding.x = {
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
            baseEncoding.x = {
                field: xField,
                type: xEncodingType,
                axis: {
                    labelAngle: records.length > 5 ? -30 : 0,
                    labelLimit: 110,
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
        baseEncoding.y = {
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
        baseEncoding.color = {
            field: colorField,
            type: 'nominal',
            scale: { range: colorPalette },
            legend: colorField === xField ? null : { orient: 'bottom', columns: 3, labelFontSize: 11, title: null },
        };
    } else {
        baseEncoding.color = { value: primaryColor };
    }

    if (tooltip.length > 0) {
        baseEncoding.tooltip = tooltip;
    }

    // 4. Vertical Bar / Column Chart with Direct Value Labels
    if (cType === 'bar') {
        const barLayer: any = {
            mark: {
                type: 'bar',
                cornerRadiusEnd: 6,
                color: colorField ? undefined : primaryColor,
            },
            encoding: baseEncoding,
        };

        if (shouldShowLabels && yField) {
            const labelLayer: any = {
                mark: {
                    type: 'text',
                    align: 'center',
                    baseline: 'bottom',
                    dy: -4,
                    fontSize: 10,
                    fontWeight: 700,
                    fill: '#475569',
                },
                encoding: {
                    x: xField ? { field: xField, type: xEncodingType } : undefined,
                    y: { field: yField, type: 'quantitative' },
                    text: { field: yField, type: 'quantitative', format: labelFormat },
                },
            };
            return {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
                title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
                width: 'container',
                height: 220,
                data: { values: records },
                layer: [barLayer, labelLayer],
                config: commonConfig,
            };
        }

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
            width: 'container',
            height: 220,
            data: { values: records },
            ...barLayer,
            config: commonConfig,
        };
    }

    // 5. Line & Step Line Charts with Direct Data Point Labels
    if (cType === 'line' || cType === 'step_line') {
        const lineLayer: any = {
            mark: {
                type: 'line',
                interpolate: cType === 'step_line' ? 'step-after' : 'monotone',
                strokeWidth: 2.5,
                color: colorField ? undefined : primaryColor,
                point: { filled: true, size: 36, fill: primaryColor },
            },
            encoding: baseEncoding,
        };

        if (shouldShowLabels && yField) {
            const labelLayer: any = {
                mark: {
                    type: 'text',
                    align: 'center',
                    baseline: 'bottom',
                    dy: -8,
                    fontSize: 10,
                    fontWeight: 700,
                    fill: '#1e293b',
                },
                encoding: {
                    x: xField ? { field: xField, type: xEncodingType } : undefined,
                    y: { field: yField, type: 'quantitative' },
                    text: { field: yField, type: 'quantitative', format: labelFormat },
                },
            };
            return {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
                title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
                width: 'container',
                height: 220,
                data: { values: records },
                layer: [lineLayer, labelLayer],
                config: commonConfig,
            };
        }

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
            width: 'container',
            height: 220,
            data: { values: records },
            ...lineLayer,
            config: commonConfig,
        };
    }

    // 6. Area Chart with Direct Top Labels
    if (cType === 'area') {
        const areaLayer: any = {
            mark: {
                type: 'area',
                interpolate: 'monotone',
                opacity: 0.28,
                color: colorField ? undefined : primaryColor,
                line: { color: primaryColor, width: 2.5 },
            },
            encoding: baseEncoding,
        };

        if (shouldShowLabels && yField) {
            const labelLayer: any = {
                mark: {
                    type: 'text',
                    align: 'center',
                    baseline: 'bottom',
                    dy: -6,
                    fontSize: 10,
                    fontWeight: 700,
                    fill: '#1e293b',
                },
                encoding: {
                    x: xField ? { field: xField, type: xEncodingType } : undefined,
                    y: { field: yField, type: 'quantitative' },
                    text: { field: yField, type: 'quantitative', format: labelFormat },
                },
            };
            return {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
                title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
                width: 'container',
                height: 220,
                data: { values: records },
                layer: [areaLayer, labelLayer],
                config: commonConfig,
            };
        }

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
            width: 'container',
            height: 220,
            data: { values: records },
            ...areaLayer,
            config: commonConfig,
        };
    }

    // 7. Scatter & Dot Plot with Direct Labels
    if (cType === 'scatter' || cType === 'dot_plot') {
        const pointLayer: any = {
            mark: {
                type: 'point',
                size: cType === 'dot_plot' ? 80 : 60,
                filled: true,
                opacity: 0.85,
                color: colorField ? undefined : primaryColor,
            },
            encoding: baseEncoding,
        };

        if (shouldShowLabels && yField) {
            const labelLayer: any = {
                mark: {
                    type: 'text',
                    align: 'center',
                    baseline: 'bottom',
                    dy: -8,
                    fontSize: 9.5,
                    fontWeight: 600,
                    fill: '#475569',
                },
                encoding: {
                    x: xField ? { field: xField, type: useVegaTemporal ? 'temporal' : (cType === 'scatter' ? 'quantitative' : 'nominal') } : undefined,
                    y: { field: yField, type: 'quantitative' },
                    text: { field: yField, type: 'quantitative', format: labelFormat },
                },
            };
            return {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
                title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
                width: 'container',
                height: 220,
                data: { values: records },
                layer: [pointLayer, labelLayer],
                config: commonConfig,
            };
        }

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
            width: 'container',
            height: 220,
            data: { values: records },
            ...pointLayer,
            config: commonConfig,
        };
    }

    return {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        title: { text: chartTitle, anchor: 'start', fontSize: 13, fontWeight: 700, color: '#0f172a' },
        width: 'container',
        height: 220,
        data: { values: records },
        mark: 'bar',
        encoding: baseEncoding,
        config: commonConfig,
    };
}
