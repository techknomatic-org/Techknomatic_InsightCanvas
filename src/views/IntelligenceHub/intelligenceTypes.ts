// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

export interface ColumnProfile {
    name: string;
    type: string;
    semantic_type: 'numeric' | 'categorical' | 'temporal' | 'boolean' | 'identifier';
    is_measure: boolean;
    is_dimension: boolean;
    is_temporal: boolean;
    null_count: number;
    null_percentage: number;
    distinct_count: number;
    sample_values: any[];
}

export interface TableProfile {
    table_name: string;
    row_count: number;
    columns: ColumnProfile[];
    measures: string[];
    dimensions: string[];
    temporal_columns: string[];
    sample_records: Record<string, any>[];
}

export interface InferredRelationship {
    table1: string;
    column1: string;
    table2: string;
    column2: string;
    confidence: string;
}

export interface DataProfile {
    tables: TableProfile[];
    table_count: number;
    total_rows: number;
    inferred_relationships: InferredRelationship[];
}

export interface DashboardSuggestion {
    id: string;
    title: string;
    description: string;
    prompt: string;
    reason: string;
    focus_metrics?: string[];
}

export interface KpiSpec {
    id: string;
    title: string;
    table?: string;
    measure_column?: string;
    aggregation?: string;
    format?: 'currency' | 'number' | 'percent' | 'integer';
    formatted_value: string;
    raw_value: number | string | null;
    subtitle?: string;
    comparison?: string;
}

export interface VisualizationSpec {
    id: string;
    title: string;
    description?: string;
    table?: string;
    chart_type: 'bar' | 'line' | 'area' | 'scatter' | 'donut' | 'pie';
    x_field?: string | null;
    y_field?: string | null;
    color_field?: string | null;
    aggregation?: string;
    data: Record<string, any>[];
    vega_spec: any;
}

export interface FilterSpec {
    table?: string;
    field?: string;
    label?: string;
    options?: (string | number)[];
    selected_value?: string | number;
}

export interface DashboardSpec {
    title: string;
    description?: string;
    filter: FilterSpec;
    kpis: KpiSpec[];
    visualizations: VisualizationSpec[];
}

export interface IntelligenceSession {
    id: string;
    title: string;
    source_id?: string;
    database?: string;
    tables: string[];
    profile?: DataProfile;
    dashboard?: DashboardSpec;
    prompt?: string;
    chat_history?: ChatMessage[];
    pinned?: boolean;
    liked?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    isUpdatingDashboard?: boolean;
}
