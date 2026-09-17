// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * Agent response resolution — maps AI agent chart recommendations to
 * concrete Chart objects.
 *
 * The encoding recommendation engine lives in the flint-chart library.
 * Use `vlRecommendEncodings` / `ecRecommendEncodings` / etc. directly.
 */

import { Channel, Chart, DictTable, FieldItem } from '../components/ComponentType';
import { generateFreshChart } from './dfSlice';
import { vlGetTemplateDef } from 'flint-chart';

/** Map from agent short names to display chart type names. */
const AGENT_CHART_TYPE_MAP: Record<string, string> = {
    scatter: 'Scatter Plot',
    regression: 'Regression',
    bar: 'Bar Chart',
    grouped_bar: 'Grouped Bar Chart',
    histogram: 'Histogram',
    line: 'Line Chart',
    area: 'Area Chart',
    heatmap: 'Heatmap',
    boxplot: 'Boxplot',
    pie: 'Pie Chart',
    lollipop: 'Lollipop Chart',
    waterfall: 'Waterfall Chart',
    candlestick: 'Candlestick Chart',
    world_map: 'World Map',
    us_map: 'US Map',
    // Legacy aliases (backward compat with older agent responses)
    point: 'Scatter Plot',
    group_bar: 'Grouped Bar Chart',
    worldmap: 'World Map',
    usmap: 'US Map',
};

/**
 * Resolve an AI agent's chart recommendation into a concrete Chart object.
 * The agent returns a `refinedGoal` with `chart.chart_type` which may be
 * a short name (e.g. "scatter"), a full template name (e.g. "Radar Chart"),
 * or a user-chosen chart type passed through from the UI.
 */
export const resolveRecommendedChart = (refinedGoal: any, allFields: FieldItem[], table: DictTable): Chart => {
    const chartObj = refinedGoal['chart'] || {};
    const rawChartType = chartObj['chart_type'];
    const chartEncodings = chartObj['encodings'];

    if (chartEncodings == undefined || rawChartType == undefined) {
        let newChart = generateFreshChart(table.id, 'Scatter Plot') as Chart;
        const basicEncodings: { [key: string]: string } = table.names.length > 1
            ? { x: table.names[0], y: table.names[1] }
            : {};
        newChart = resolveChartFields(newChart, allFields, basicEncodings, table);
        return newChart;
    }

    // Resolve chart type: try short-name map first, then check if it's already a valid template name
    const chartType = AGENT_CHART_TYPE_MAP[rawChartType]
        || (vlGetTemplateDef(rawChartType) ? rawChartType : undefined)
        || 'Scatter Plot';
    let newChart = generateFreshChart(table.id, chartType) as Chart;
    newChart = resolveChartFields(newChart, allFields, chartEncodings, table);

    // Apply chart config properties from agent recommendation
    if (chartObj['config'] && typeof chartObj['config'] === 'object') {
        newChart.config = { ...chartObj['config'] };
    }

    // Legacy: "Dotted Line Chart" was folded into Line Chart with a `showPoints` config flag.
    if (rawChartType === 'Dotted Line Chart' || rawChartType === 'dotted_line') {
        newChart.chartType = 'Line Chart';
        newChart.config = { ...(newChart.config || {}), showPoints: true };
    }
    return newChart;
};

/**
 * Populate a chart's encodingMap from a plain { channel: fieldName } object.
 */
export const resolveChartFields = (
    chart: Chart,
    allFields: FieldItem[],
    chartEncodings: { [key: string]: string },
    table: DictTable,
): Chart => {
    // Get the keys that should be present after this update
    const newEncodingKeys = new Set(Object.keys(chartEncodings).map(key => key === 'facet' ? 'column' : key));

    // Remove encodings that are no longer in chartEncodings
    for (const key of Object.keys(chart.encodingMap)) {
        if (!newEncodingKeys.has(key) && chart.encodingMap[key as Channel]?.fieldID != undefined) {
            chart.encodingMap[key as Channel] = {};
        }
    }

    // Add/update encodings from chartEncodings
    for (let [key, value] of Object.entries(chartEncodings)) {
        if (key === 'facet') {
            key = 'column';
        }

        const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : '';
        const field = allFields.find(c => c.name === value)
            || allFields.find(c => c.name.trim().toLowerCase() === normalizedValue);
        if (field) {
            chart.encodingMap[key as Channel] = { fieldID: field.id };
        }
    }

    // Auto-repair missing required positional channels across all chart categories
    const twoAxisStandard = new Set([
        'Line Chart', 'Area Chart', 'Bar Chart', 'Scatter Plot', 'Regression',
        'Boxplot', 'Lollipop Chart', 'Waterfall Chart', 'Grouped Bar Chart',
        'Stacked Bar Chart', 'Range Area Chart', 'Violin Plot', 'Strip Plot',
        'Bump Chart', 'Connected Scatter Plot', 'Ranged Dot Plot', 'Pyramid Chart',
        'Sparkline', 'Slope Chart', 'Streamgraph', 'Rose Chart', 'Radar Chart',
        'Heatmap',
    ]);
    const invertedBarCharts = new Set(['Bar Table', 'Bullet Chart', 'Gantt Chart']);
    const circularCharts = new Set(['Pie Chart', 'Donut Chart']);
    const distribution1Axis = new Set(['Histogram', 'Density Plot', 'ECDF Plot']);

    if (table?.rows && table.rows.length > 0 && table.names) {
        const assignedIds = new Set(
            Object.values(chart.encodingMap).map(enc => enc?.fieldID).filter((id): id is string => Boolean(id))
        );
        const firstRow = table.rows[0];
        const findNumericField = () => {
            const numericCol = table.names.find(col => {
                const f = allFields.find(c => c.name === col);
                if (!f || assignedIds.has(f.id)) return false;
                const val = firstRow[col];
                return typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '');
            });
            return numericCol ? allFields.find(c => c.name === numericCol) : undefined;
        };
        const findCategoricalOrAnyField = () => {
            const col = table.names.find(c => {
                const f = allFields.find(item => item.name === c);
                return f && !assignedIds.has(f.id);
            });
            return col ? allFields.find(c => c.name === col) : undefined;
        };

        if (twoAxisStandard.has(chart.chartType)) {
            if (!chart.encodingMap.y?.fieldID) {
                const f = findNumericField();
                if (f) { chart.encodingMap.y = { fieldID: f.id }; assignedIds.add(f.id); }
            }
            if (!chart.encodingMap.x?.fieldID) {
                const f = findCategoricalOrAnyField();
                if (f) { chart.encodingMap.x = { fieldID: f.id }; assignedIds.add(f.id); }
            }
        } else if (invertedBarCharts.has(chart.chartType)) {
            if (!chart.encodingMap.x?.fieldID) {
                const f = findNumericField();
                if (f) { chart.encodingMap.x = { fieldID: f.id }; assignedIds.add(f.id); }
            }
            if (!chart.encodingMap.y?.fieldID) {
                const f = findCategoricalOrAnyField();
                if (f) { chart.encodingMap.y = { fieldID: f.id }; assignedIds.add(f.id); }
            }
        } else if (circularCharts.has(chart.chartType)) {
            if (!chart.encodingMap.size?.fieldID) {
                const f = findNumericField();
                if (f) { chart.encodingMap.size = { fieldID: f.id }; assignedIds.add(f.id); }
            }
            if (!chart.encodingMap.color?.fieldID) {
                const f = findCategoricalOrAnyField();
                if (f) { chart.encodingMap.color = { fieldID: f.id }; assignedIds.add(f.id); }
            }
        } else if (distribution1Axis.has(chart.chartType)) {
            if (!chart.encodingMap.x?.fieldID) {
                const f = findNumericField() || findCategoricalOrAnyField();
                if (f) { chart.encodingMap.x = { fieldID: f.id }; assignedIds.add(f.id); }
            }
        } else if (chart.chartType === 'KPI Card') {
            if (!chart.encodingMap.value?.fieldID) {
                const f = findNumericField();
                if (f) { chart.encodingMap.value = { fieldID: f.id }; assignedIds.add(f.id); }
            }
            if (!chart.encodingMap.metric?.fieldID) {
                const f = findCategoricalOrAnyField();
                if (f) { chart.encodingMap.metric = { fieldID: f.id }; assignedIds.add(f.id); }
            }
        }
    }

    return chart;
};
