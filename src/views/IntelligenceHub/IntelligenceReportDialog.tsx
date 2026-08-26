// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    IconButton,
    CircularProgress,
    Tooltip,
    Alert,
    Paper,
    Chip,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import embed from 'vega-embed';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DashboardSpec, VisualizationSpec, KpiSpec } from './intelligenceTypes';
import { sanitizeFileName } from './dashboardExport';

interface IntelligenceReportDialogProps {
    open: boolean;
    onClose: () => void;
    reportTitle?: string;
    reportMarkdown?: string;
    loading: boolean;
    error?: string | null;
    onRegenerate?: () => void;
    dashboard?: DashboardSpec | null;
}

const ACCENTS = [
    { color: '#1B75BB', bg: '#f0f9ff', border: '#bae6fd' },
    { color: '#10B981', bg: '#f0fdf4', border: '#bbf7d0' },
    { color: '#8B5CF6', bg: '#f5f3ff', border: '#ddd6fe' },
    { color: '#F59E0B', bg: '#fffbeb', border: '#fde68a' },
];

/**
 * Embedded Vega-Lite chart inside the report
 */
const ReportEmbeddedChart: React.FC<{ viz: VisualizationSpec; index: number }> = ({ viz, index }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !viz.vega_spec) return;

        let isMounted = true;
        const target = containerRef.current;
        target.innerHTML = '';

        const specToRender: any = {
            ...viz.vega_spec,
            width: 'container',
            height: 180,
            autosize: { type: 'fit', contains: 'padding' },
            config: {
                ...(viz.vega_spec.config || {}),
                background: 'transparent',
                view: { stroke: 'transparent' },
                axis: {
                    domainColor: '#e2e8f0',
                    tickColor: '#e2e8f0',
                    gridColor: '#f8fafc',
                    labelFont: 'Inter, sans-serif',
                    titleFont: 'Inter, sans-serif',
                },
            },
        };

        embed(target, specToRender, {
            actions: false,
            renderer: 'svg',
        }).catch((err) => {
            if (isMounted) {
                console.warn('Report vega embed warning:', viz.title, err);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [viz.vega_spec, viz.data]);

    const getIcon = (type?: string) => {
        switch ((type || '').toLowerCase()) {
            case 'line':
                return <ShowChartIcon sx={{ fontSize: 13 }} />;
            case 'area':
                return <TimelineIcon sx={{ fontSize: 13 }} />;
            case 'pie':
            case 'donut':
                return <PieChartIcon sx={{ fontSize: 13 }} />;
            default:
                return <BarChartIcon sx={{ fontSize: 13 }} />;
        }
    };

    return (
        <Paper
            elevation={0}
            className="report-chart-card"
            sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                mb: 2,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                minWidth: 0,
                boxSizing: 'border-box',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                    Visual #{index + 1}: {viz.title}
                </Typography>
                <Chip
                    size="small"
                    icon={getIcon(viz.chart_type)}
                    label={viz.chart_type || 'chart'}
                    sx={{
                        height: 19,
                        fontSize: '9.5px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        bgcolor: 'rgba(27, 117, 187, 0.08)',
                        color: '#1B75BB',
                    }}
                />
            </Box>
            {viz.description && (
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '11px', display: 'block', mb: 1 }}>
                    {viz.description}
                </Typography>
            )}
            <Box
                ref={containerRef}
                sx={{
                    width: '100%',
                    minHeight: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& svg': { maxWidth: '100% !important', height: 'auto' },
                }}
            />
        </Paper>
    );
};

export const IntelligenceReportDialog: React.FC<IntelligenceReportDialogProps> = ({
    open,
    onClose,
    reportTitle = 'Executive Intelligence Report',
    reportMarkdown = '',
    loading,
    error,
    onRegenerate,
    dashboard,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!reportMarkdown) return;
        try {
            await navigator.clipboard.writeText(reportMarkdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            console.error('Failed to copy report:', e);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!reportMarkdown) return;
        const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `${sanitizeFileName(reportTitle)}-${dateStr}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handlePrintOrPdf = () => {
        const reportRoot = document.getElementById('intelligence-full-report-container');
        if (!reportRoot) return;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        try {
            // Collect all application styles and fonts
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map((node) => node.outerHTML)
                .join('\n');

            const doc = printFrame.contentDocument;
            const win = printFrame.contentWindow;
            if (!doc || !win) return;

            const cleanTitle = sanitizeFileName(reportTitle);
            const dateStr = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            // Clone report element and reset any overflow / height restrictions
            const clone = reportRoot.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('*').forEach((el: any) => {
                if (el.style) {
                    if (el.style.overflow || el.style.overflowY || el.style.overflowX) {
                        el.style.overflow = 'visible';
                        el.style.overflowY = 'visible';
                        el.style.overflowX = 'visible';
                    }
                    if (el.style.maxHeight) {
                        el.style.maxHeight = 'none';
                    }
                    if (el.style.height === '100%') {
                        el.style.height = 'auto';
                    }
                }
            });

            doc.open();
            doc.write(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${cleanTitle}</title>
    ${styles}
    <style>
        @page {
            size: portrait;
            margin: 0mm;
        }
        *, *::before, *::after {
            box-sizing: border-box !important;
            overflow: visible !important;
            max-height: none !important;
        }
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            background: #ffffff !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.6;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        @media print {
            html, body {
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
            }
        }
        .report-page-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
        }
        .page-margin-top-spacer {
            height: 12mm !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
        }
        .page-margin-bottom-spacer {
            height: 12mm !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
        }
        .page-content-cell {
            padding: 0 15mm !important;
            border: none !important;
            vertical-align: top !important;
            background: #ffffff !important;
        }
        .report-header-print {
            border-bottom: 2.5px solid #1B75BB;
            padding-bottom: 10px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        .report-header-title {
            font-size: 19px;
            font-weight: 800;
            color: #001d52;
        }
        .report-header-meta {
            font-size: 11px;
            color: #64748b;
        }
        .report-kpi-grid-container {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 10px !important;
            margin-bottom: 20px !important;
            width: 100% !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        .report-kpi-card {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        .report-visuals-grid-container {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
            margin-top: 14px !important;
            width: 100% !important;
        }
        .report-chart-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 12px !important;
            background: #ffffff !important;
            margin-bottom: 12px !important;
            height: auto !important;
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        li, p, tr, blockquote {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
        }
        h1, h2, h3, h4 {
            break-after: avoid !important;
            page-break-after: avoid !important;
        }
        h1 {
            font-size: 18px !important;
            color: #001d52 !important;
            border-bottom: 1.5px solid #e2e8f0 !important;
            padding-bottom: 6px !important;
            margin-top: 18px !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
        }
        h2 {
            font-size: 15px !important;
            color: #1e293b !important;
            margin-top: 16px !important;
            border-left: 3.5px solid #1B75BB !important;
            padding-left: 8px !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
        }
        h3 {
            font-size: 13.5px !important;
            color: #334155 !important;
            margin-top: 12px !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
        }
        p, li {
            color: #334155 !important;
            font-size: 12.5px !important;
            line-height: 1.6 !important;
        }
        blockquote {
            background: #f0f9ff !important;
            border-left: 3px solid #0ea5e9 !important;
            margin: 12px 0 !important;
            padding: 8px 14px !important;
            color: #0369a1 !important;
            font-size: 12px !important;
            border-radius: 4px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 14px 0 !important;
            font-size: 12px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 9px !important;
            text-align: left !important;
        }
        th {
            background: #f8fafc !important;
            color: #1e293b !important;
            font-weight: 600 !important;
        }
        tr:nth-child(even) {
            background: #fcfdfe !important;
        }
        svg {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
        }
    </style>
</head>
<body>
    <table class="report-page-table">
        <thead>
            <tr><td class="page-margin-top-spacer"></td></tr>
        </thead>
        <tbody>
            <tr>
                <td class="page-content-cell">
                    <div class="report-header-print">
                        <div>
                            <div class="report-header-title">${reportTitle}</div>
                            <div class="report-header-meta">InsightCanvas Intelligence Hub | Executive Strategy Briefing</div>
                        </div>
                        <div class="report-header-meta">
                            ${dateStr}
                        </div>
                    </div>
                    <div>
                        ${clone.innerHTML}
                    </div>
                </td>
            </tr>
        </tbody>
        <tfoot>
            <tr><td class="page-margin-bottom-spacer"></td></tr>
        </tfoot>
    </table>
</body>
</html>`);
            doc.close();

            setTimeout(() => {
                win.focus();
                win.print();
            }, 800);
        } finally {
            setTimeout(() => printFrame.remove(), 4000);
        }
    };

    const kpis: KpiSpec[] = dashboard?.kpis || [];
    const visuals: VisualizationSpec[] = dashboard?.visualizations || [];
    const filterInfo = dashboard?.filter;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: '0 24px 60px rgba(0, 29, 82, 0.2)',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    p: 2,
                    px: 3,
                    bgcolor: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #1B75BB 0%, #4F46E5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(27, 117, 187, 0.25)',
                        }}
                    >
                        <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#001d52', fontSize: '15px', lineHeight: 1.2 }}>
                            Executive Intelligence Report
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '11px' }}>
                            {reportTitle}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!loading && reportMarkdown && (
                        <>
                            <Tooltip title="Download as PDF or Print">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
                                    onClick={handlePrintOrPdf}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        bgcolor: '#1B75BB',
                                        '&:hover': { bgcolor: '#145d97' },
                                    }}
                                >
                                    Download PDF
                                </Button>
                            </Tooltip>

                            <Tooltip title="Download Markdown (.md)">
                                <IconButton size="small" onClick={handleDownloadMarkdown} sx={{ color: '#64748b' }}>
                                    <DownloadIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                                <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? '#10b981' : '#64748b' }}>
                                    {copied ? <CheckIcon sx={{ fontSize: 18 }} /> : <ContentCopyIcon sx={{ fontSize: 18 }} />}
                                </IconButton>
                            </Tooltip>
                        </>
                    )}

                    <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Box>
            </DialogTitle>

            {/* Content Area */}
            <DialogContent sx={{ p: 3, bgcolor: '#f8fafc', flex: 1, overflowY: 'auto' }}>
                {loading && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 8,
                            gap: 2.5,
                        }}
                    >
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress size={52} thickness={4} sx={{ color: '#1B75BB' }} />
                            <Box
                                sx={{
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    right: 0,
                                    position: 'absolute',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <AutoAwesomeIcon sx={{ fontSize: 20, color: '#4F46E5' }} />
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#001d52', fontSize: '15px' }}>
                                Synthesizing Comprehensive Executive Intelligence Report...
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, maxWidth: 420 }}>
                                Deeply analyzing all 4 KPI performance metrics, synthesizing multi-dimensional chart findings, and structuring strategic business insights.
                            </Typography>
                        </Box>
                    </Box>
                )}

                {error && (
                    <Alert
                        severity="error"
                        action={
                            onRegenerate && (
                                <Button color="inherit" size="small" onClick={onRegenerate}>
                                    Retry
                                </Button>
                            )
                        }
                        sx={{ my: 2 }}
                    >
                        {error}
                    </Alert>
                )}

                {!loading && reportMarkdown && (
                    <Paper
                        id="intelligence-full-report-container"
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, md: 4 },
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#ffffff',
                            color: '#1e293b',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        }}
                    >
                        {/* Report Scope / Filter Badge Header */}
                        {filterInfo && (
                            <Box
                                sx={{
                                    p: 1.5,
                                    px: 2,
                                    mb: 3,
                                    borderRadius: '8px',
                                    bgcolor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', fontSize: '10px' }}>
                                        Active Analytical Scope:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7', fontSize: '12px' }}>
                                        {filterInfo.label || filterInfo.field} = {String(filterInfo.selected_value || 'All')}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#0284c7', fontSize: '11px' }}>
                                    Dashboard: {dashboard?.title || 'Overview'}
                                </Typography>
                            </Box>
                        )}

                        {/* Visual 1: KPI Metric Scorecard Grid */}
                        {kpis.length > 0 && (
                            <Box sx={{ mb: 3.5, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#001d52', mb: 1.5, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    📊 Executive KPI Performance Scorecard
                                </Typography>
                                <Box
                                    className="report-kpi-grid-container"
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                                        gap: 1.5,
                                        width: '100%',
                                    }}
                                >
                                    {kpis.map((kpi, idx) => {
                                        const accent = ACCENTS[idx % ACCENTS.length];
                                        return (
                                            <Paper
                                                key={kpi.id || idx}
                                                elevation={0}
                                                className="report-kpi-card"
                                                sx={{
                                                    p: 1.8,
                                                    borderRadius: '10px',
                                                    border: `1px solid ${accent.border}`,
                                                    bgcolor: accent.bg,
                                                    borderTop: `3.5px solid ${accent.color}`,
                                                    breakInside: 'avoid',
                                                    pageBreakInside: 'avoid',
                                                    minWidth: 0,
                                                    boxSizing: 'border-box',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#475569',
                                                            fontSize: '10px',
                                                            textTransform: 'uppercase',
                                                            display: 'block',
                                                            mb: 0.5,
                                                            lineHeight: 1.3,
                                                            minHeight: '26px',
                                                        }}
                                                    >
                                                        {kpi.title}
                                                    </Typography>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '19px', lineHeight: 1.2, mb: 0.4, wordBreak: 'break-word' }}>
                                                        {kpi.formatted_value || '—'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10px', display: 'block', lineHeight: 1.3 }}>
                                                        {kpi.subtitle || `${kpi.aggregation || 'Total'} metric`}
                                                    </Typography>
                                                </Box>
                                                {kpi.comparison && (
                                                    <Chip
                                                        size="small"
                                                        icon={<TrendingUpIcon sx={{ fontSize: '10px !important' }} />}
                                                        label={kpi.comparison}
                                                        sx={{
                                                            mt: 1,
                                                            height: 18,
                                                            fontSize: '9px',
                                                            fontWeight: 600,
                                                            bgcolor: '#ecfdf5',
                                                            color: '#059669',
                                                            border: '1px solid #a7f3d0',
                                                            alignSelf: 'flex-start',
                                                        }}
                                                    />
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}

                        <Divider sx={{ my: 3 }} />

                        {/* Markdown Narrative Analysis */}
                        <Box
                            id="intelligence-report-rendered-markdown"
                            sx={{
                                '& h1': {
                                    fontSize: '20px',
                                    fontWeight: 800,
                                    color: '#001d52',
                                    borderBottom: '2px solid #e2e8f0',
                                    pb: 1.2,
                                    mb: 2,
                                    mt: 0,
                                    breakAfter: 'avoid',
                                    pageBreakAfter: 'avoid',
                                },
                                '& h2': {
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    borderLeft: '4px solid #1B75BB',
                                    pl: 1.5,
                                    mt: 3,
                                    mb: 1.5,
                                    breakAfter: 'avoid',
                                    pageBreakAfter: 'avoid',
                                },
                                '& h3': {
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    color: '#334155',
                                    mt: 2,
                                    mb: 1,
                                    breakAfter: 'avoid',
                                    pageBreakAfter: 'avoid',
                                },
                                '& p': {
                                    fontSize: '13px',
                                    lineHeight: 1.7,
                                    color: '#334155',
                                    mb: 1.5,
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                },
                                '& blockquote': {
                                    bgcolor: '#f0f9ff',
                                    borderLeft: '4px solid #0ea5e9',
                                    p: 1.5,
                                    px: 2,
                                    borderRadius: '6px',
                                    color: '#0369a1',
                                    fontSize: '12.5px',
                                    my: 2,
                                    mx: 0,
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                    '& p': { mb: 0, color: '#0369a1' },
                                },
                                '& ul, & ol': {
                                    pl: 2.5,
                                    mb: 1.8,
                                },
                                '& li': {
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    color: '#334155',
                                    mb: 0.8,
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                },
                                '& strong': {
                                    color: '#0f172a',
                                    fontWeight: 600,
                                },
                                '& table': {
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    my: 2,
                                    fontSize: '12px',
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                },
                                '& th, & td': {
                                    border: '1px solid #e2e8f0',
                                    p: 1.2,
                                    textAlign: 'left',
                                },
                                '& th': {
                                    bgcolor: '#f8fafc',
                                    fontWeight: 600,
                                    color: '#1e293b',
                                },
                                '& tr': {
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                },
                                '& tr:nth-of-type(even)': {
                                    bgcolor: '#fcfdfe',
                                },
                            }}
                        >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMarkdown}</ReactMarkdown>
                        </Box>

                        {/* Visual 2: Embedded Interactive Charts Gallery */}
                        {visuals.length > 0 && (
                            <Box sx={{ mt: 4, pt: 3, borderTop: '2px dashed #e2e8f0' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#001d52', mb: 0.5, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    📈 Embedded Visual Analytics Gallery
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5, fontSize: '11px' }}>
                                    Live multi-dimensional visual charts referenced in the analytical observations above.
                                </Typography>

                                <Box
                                    className="report-visuals-grid-container"
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                                        gap: 2.5,
                                        width: '100%',
                                    }}
                                >
                                    {visuals.map((viz, idx) => (
                                        <ReportEmbeddedChart key={viz.id || idx} viz={viz} index={idx} />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Paper>
                )}
            </DialogContent>

            {/* Footer Actions */}
            <DialogActions sx={{ p: 2, px: 3, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        InsightCanvas Strategic Intelligence Analyst
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    {!loading && reportMarkdown && (
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PrintIcon sx={{ fontSize: 15 }} />}
                            onClick={handlePrintOrPdf}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '8px',
                                borderColor: '#cbd5e1',
                                color: '#475569',
                                fontSize: '12.5px',
                            }}
                        >
                            Print Report
                        </Button>
                    )}
                    <Button
                        size="small"
                        onClick={onClose}
                        sx={{
                            textTransform: 'none',
                            color: '#64748b',
                            fontSize: '12.5px',
                        }}
                    >
                        Close
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};
