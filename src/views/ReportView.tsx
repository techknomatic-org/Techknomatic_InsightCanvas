// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { FC, useState, useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    useTheme,
    CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { DataFormulatorState, dfActions, dfSelectors, GeneratedReport } from '../app/dfSlice';
import { Message } from './MessageSnackbar';
import { DictTable } from '../components/ComponentType';
import { AppDispatch } from '../app/store';
import { TiptapReportEditor } from './TiptapReportEditor';
import { getCachedChart } from '../app/chartCache';
import { floatingPillSx } from '../app/tokens';
import { iconVar, textVar } from '../app/layout';
import { useTranslation } from 'react-i18next';

export const ReportView: FC = () => {
    // Get all generated reports from Redux state
    const dispatch = useDispatch<AppDispatch>();

    const charts = useSelector((state: DataFormulatorState) => state.charts);
    const tables = useSelector(dfSelectors.getAllTables);
    const activeModel = useSelector(dfSelectors.getActiveModel);
    const conceptShelfItems = useSelector((state: DataFormulatorState) => state.conceptShelfItems);
    const config = useSelector((state: DataFormulatorState) => state.config);
    const allGeneratedReports = useSelector(dfSelectors.getAllGeneratedReports);
    const serverConfig = useSelector((state: DataFormulatorState) => state.serverConfig);
    const focusedId = useSelector((state: DataFormulatorState) => state.focusedId);
    // Thumbnails live in their own slice so updates don't churn `state.charts`.
    const chartThumbnails = useSelector((state: DataFormulatorState) => state.chartThumbnails) || {};
    const focusedChartId = focusedId?.type === 'chart' ? focusedId.chartId : undefined;
    const theme = useTheme();
    const { t } = useTranslation();

    const [currentReportId, setCurrentReportId] = useState<string | undefined>(undefined);
    const [generatedReport, setGeneratedReport] = useState<string>('');

    // Derive active report: priority to focused report, then currentReportId, then first report
    const focusedReportId = focusedId?.type === 'report' ? focusedId.reportId : undefined;
    const activeReportId = focusedReportId || currentReportId || allGeneratedReports[0]?.id;
    const currentReport = allGeneratedReports.find(r => r.id === activeReportId);
    const isGenerating = currentReport?.status === 'generating';

    const [cachedReportImages, setCachedReportImages] = useState<Record<string, { url: string; width: number; height: number }>>({});
    // Read-first: report opens as a clean text page; users opt into editing explicitly.
    const [isEditMode, setIsEditMode] = useState(false);
    // Download/share menu anchored to the floating download button.
    const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const updateCachedReportImages = (chartId: string, blobUrl: string, width: number, height: number) => {
        setCachedReportImages(prev => ({
            ...prev,
            [chartId]: { url: blobUrl, width, height }
        }));
    };

    // The report content column is capped at 816px (see render below); leave a
    // little breathing room so embedded charts never butt against the edge.
    const REPORT_MAX_CHART_WIDTH = 720;

    // Derive the embed dimensions for a chart from the size the rendering engine
    // actually chose (stored on the cache entry). We preserve that aspect ratio
    // and only scale down to fit the report column — never up — so a wide time
    // series stays wide and a tall chart stays tall, instead of being forced
    // into a fixed square. Falls back to the configured default when the engine
    // size isn't available yet (e.g. transient thumbnail-only state on reload).
    const embedDimsFor = (chartId: string): { width: number; height: number } => {
        const cached = getCachedChart(chartId);
        const natW = cached?.naturalWidth;
        const natH = cached?.naturalHeight;
        if (natW && natH) {
            const scale = Math.min(REPORT_MAX_CHART_WIDTH / natW, 1);
            return { width: Math.round(natW * scale), height: Math.round(natH * scale) };
        }
        return { width: config.defaultChartWidth, height: config.defaultChartHeight };
    };

    // Helper function to show messages using dfSlice
    const showMessage = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        const msg: Message = {
            type,
            component: t('messages.report.component'),
            timestamp: Date.now(),
            value: message
        };
        dispatch(dfActions.addMessages(msg));
    };

    const getReportElement = (): HTMLElement | null => {
        return document.querySelector('[data-report-content]') as HTMLElement | null;
    };

    const createReportExportClone = (): { reportElement: HTMLElement; clone: HTMLElement } | null => {
        const reportElement = getReportElement();
        if (!reportElement) {
            showMessage(t('report.couldNotFindContent'), 'error');
            return null;
        }

        const clone = reportElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-report-toolbar]').forEach(el => el.remove());
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        return { reportElement, clone };
    };

    const getReportTitle = (root?: ParentNode | null): string => {
        const source = root || getReportElement();
        const titleText = source?.querySelector('h1, h2, h3')?.textContent
            || source?.querySelector('p')?.textContent
            || currentReport?.content?.split('\n').find(line => line.trim().length > 0)
            || t('report.untitled');

        return titleText
            .replace(/```markdown|```/g, '')
            .replace(/^#+\s*/, '')
            .trim()
            || t('report.untitled');
    };

    const sanitizeFileName = (name: string): string => {
        const sanitized = name
            .replace(/[\\/:*?"<>|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[. ]+$/g, '')
            .slice(0, 80);

        return sanitized || t('report.untitled');
    };

    const getReportFileName = (extension: string): string => {
        const date = new Date().toISOString().slice(0, 10);
        return `${sanitizeFileName(getReportTitle())}-${date}.${extension}`;
    };

    const exportReportAsDocx = async () => {
        const exportClone = createReportExportClone();
        if (!exportClone) return;

        const { reportElement, clone } = exportClone;
        try {
            // Inline chart images as base64 so they render directly inside the Word document
            const imgs = clone.querySelectorAll('img');
            await Promise.all(Array.from(imgs).map(async (img) => {
                try {
                    const src = (reportElement.querySelector(`img[src="${CSS.escape(img.getAttribute('src') || '')}"]`) as HTMLImageElement)
                        || (reportElement.querySelector(`img[data-chart-id="${CSS.escape(img.getAttribute('data-chart-id') || '')}"]`) as HTMLImageElement);
                    if (!src || !src.complete || src.naturalWidth === 0) return;
                    const canvas = document.createElement('canvas');
                    canvas.width = src.naturalWidth;
                    canvas.height = src.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.drawImage(src, 0, 0);
                    img.setAttribute('src', canvas.toDataURL('image/png'));
                } catch {
                    // Cross-origin or tainted canvas fallback
                }
            }));

            // Strip editor-only attributes/classes that external word processors may misinterpret
            clone.querySelectorAll('*').forEach(el => {
                el.removeAttribute('contenteditable');
                el.removeAttribute('draggable');
                el.removeAttribute('data-node-type');
                el.removeAttribute('data-type');
                el.removeAttribute('data-chart-id');
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-')) {
                        el.removeAttribute(attr.name);
                    }
                });
                if (el.getAttribute('class')?.match(/ProseMirror|tiptap|node-/)) {
                    el.removeAttribute('class');
                }
            });

            const reportTitle = sanitizeFileName(getReportTitle(clone));
            const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset='utf-8'>
    <title>${reportTitle}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        @page {
            size: A4;
            margin: 1.0in 1.0in 1.0in 1.0in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
        }
        body {
            font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1e293b;
            background-color: #ffffff;
        }
        h1 {
            font-size: 18pt;
            color: #001d52;
            margin-top: 18pt;
            margin-bottom: 6pt;
            border-bottom: 1.5pt solid #e2e8f0;
            padding-bottom: 4pt;
            page-break-after: avoid;
        }
        h2 {
            font-size: 14pt;
            color: #1e293b;
            margin-top: 16pt;
            margin-bottom: 6pt;
            border-left: 3.5pt solid #1B75BB;
            padding-left: 6pt;
            page-break-after: avoid;
        }
        h3 {
            font-size: 12pt;
            color: #334155;
            margin-top: 12pt;
            margin-bottom: 4pt;
            page-break-after: avoid;
        }
        p {
            margin: 0 0 8pt 0;
            color: #334155;
        }
        ul, ol {
            margin: 0 0 10pt 0;
            padding-left: 20pt;
        }
        li {
            margin-bottom: 4pt;
            color: #334155;
        }
        blockquote {
            background-color: #f0f9ff;
            border-left: 3.5pt solid #0ea5e9;
            margin: 10pt 0;
            padding: 8pt 12pt;
            color: #0369a1;
            font-size: 10.5pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            font-size: 10pt;
        }
        th, td {
            border: 1pt solid #cbd5e1;
            padding: 6pt 8pt;
            text-align: left;
        }
        th {
            background-color: #f8fafc;
            font-weight: bold;
            color: #1e293b;
        }
        img {
            max-width: 100%;
            height: auto;
            margin: 12pt 0;
            page-break-inside: avoid;
        }
        strong {
            color: #0f172a;
        }
    </style>
</head>
<body>
    ${clone.innerHTML}
</body>
</html>`;

            const blob = new Blob(['\ufeff', wordHtml], {
                type: 'application/vnd.ms-word;charset=utf-8',
            });
            const fileName = getReportFileName('docx');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showMessage(t('report.wordDownloaded'));
        } catch (error) {
            console.error('Error downloading Word docx report:', error);
            showMessage(t('report.failedToExportDocx'), 'error');
        }
    };

    const waitForImages = async (root: ParentNode) => {
        const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(imgs.map(img => {
            if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
            return new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
            });
        }));
    };

    const exportReportAsPdf = async () => {
        const reportElement = getReportElement();
        if (!reportElement) {
            showMessage(t('report.couldNotFindContent'), 'error');
            return;
        }

        try {
            setDownloadingPdf(true);
            showMessage(t('report.generatingPdf'), 'info');
            await waitForImages(reportElement);
            const reportTitle = getReportTitle(reportElement);
            const { downloadElementAsDirectPdf } = await import('./IntelligenceHub/pdfDirectExport');
            await downloadElementAsDirectPdf(reportElement, reportTitle);
            showMessage(t('report.pdfDownloaded'));
        } catch (error) {
            console.error('Error exporting report PDF:', error);
            showMessage(t('report.failedToExportPdf'), 'error');
        } finally {
            setDownloadingPdf(false);
        }
    };



    const processReport = (rawReport: string): string => {
        if (!rawReport) return '';
        const markdownMatch = rawReport.match(/```markdown\r?\n([\s\S]*?)(?:\r?\n```)?$/);
        let processed = markdownMatch ? markdownMatch[1] : rawReport;

        const makeImg = (chartId: string, url: string, width: number, height: number, caption?: string) => {
            return `<img src="${url}" alt="${caption || t('report.chartAlt')}" data-chart-id="${chartId}" width="${width}" height="${height}" style="max-width:100%;" />`;
        };

        // Process ![caption](chart://chart_id) syntax
        processed = processed.replace(/!\[([^\]]*)\]\(chart:\/\/([^)]+)\)/g, (_match, caption, chartId) => {
            const cached = cachedReportImages[chartId];
            if (cached) {
                return makeImg(chartId, cached.url, cached.width, cached.height, caption);
            }
            // Placeholder while image loads
            return `<p style="text-align:center;color:#999;padding:16px 0;">📊 ${caption || chartId}</p>`;
        });

        // Legacy: Process [IMAGE(chart_id)] syntax (backward compatibility)
        const usedKeys = new Set<string>();
        Object.entries(cachedReportImages).forEach(([chartId, { url, width, height }]) => {
            const escaped = chartId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\[IMAGE\\(${escaped}\\)\\]`, 'g');
            if (regex.test(processed)) {
                usedKeys.add(chartId);
                processed = processed.replace(regex, makeImg(chartId, url, width, height));
            }
        });

        const unusedEntries = Object.entries(cachedReportImages)
            .filter(([key]) => !usedKeys.has(key));
        let unusedIdx = 0;
        processed = processed.replace(/\[IMAGE\([^\)]+\)\]/g, () => {
            if (unusedIdx < unusedEntries.length) {
                const [chartId, { url, width, height }] = unusedEntries[unusedIdx++];
                return makeImg(chartId, url, width, height);
            }
            return '';
        });

        // Refresh stale <img> tags that have data-chart-id with updated blob URLs
        Object.entries(cachedReportImages).forEach(([chartId, { url, width, height }]) => {
            const escaped = chartId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const imgRegex = new RegExp(`<img([^>]*?)data-chart-id="${escaped}"([^>]*?)>`, 'g');
            processed = processed.replace(imgRegex, makeImg(chartId, url, width, height));
        });

        return processed;
    };

    const cacheChartsForReport = (report: GeneratedReport) => {
        const chartIds = new Set(report.selectedChartIds || []);
        const matches = report.content?.matchAll(/chart:\/\/([^\s\)]+)/g);
        if (matches) {
            for (const match of matches) {
                if (match[1]) chartIds.add(match[1]);
            }
        }

        chartIds.forEach((chartId) => {
            const chart = charts.find(c => c.id === chartId);
            if (!chart) return;
            if (chart.chartType === 'Table' || chart.chartType === '?') return;

            // Try SVG cache first (instant, high quality)
            const cached = getCachedChart(chartId);
            if (cached?.svg) {
                const blob = new Blob([cached.svg], { type: 'image/svg+xml;charset=utf-8' });
                const blobUrl = URL.createObjectURL(blob);
                const { width, height } = embedDimsFor(chartId);
                updateCachedReportImages(chartId, blobUrl, width, height);
            } else if (chartThumbnails[chartId]) {
                // Fall back to thumbnail
                const { width, height } = embedDimsFor(chartId);
                updateCachedReportImages(chartId, chartThumbnails[chartId], width, height);
            }
        });
    };

    const loadReport = (reportId: string) => {
        const report = allGeneratedReports.find(r => r.id === reportId);
        if (report) {
            setCurrentReportId(reportId);
            setGeneratedReport(report.content || '');
            cacheChartsForReport(report);
        }
    };

    // Keep currentReportId synced to active report
    useEffect(() => {
        if (activeReportId && activeReportId !== currentReportId) {
            setCurrentReportId(activeReportId);
        } else if (!currentReportId && allGeneratedReports.length > 0) {
            setCurrentReportId(allGeneratedReports[0].id);
        }
    }, [activeReportId, currentReportId, allGeneratedReports]);

    // Always return to read mode when switching reports or while a report is generating.
    useEffect(() => {
        setIsEditMode(false);
    }, [currentReportId]);

    useEffect(() => {
        if (isGenerating) {
            setIsEditMode(false);
        }
    }, [isGenerating]);

    // When focused report is cleared, go back to editor view
    useEffect(() => {
        if (!focusedReportId && !isGenerating) {
            dispatch(dfActions.setViewMode('editor'));
        }
    }, [focusedReportId, isGenerating, dispatch]);

    // When a report is focused via the thread or tables/charts update, load/cache it
    useEffect(() => {
        if (activeReportId) {
            loadReport(activeReportId);
            const timer = setTimeout(() => loadReport(activeReportId), 800);
            return () => clearTimeout(timer);
        }
    }, [activeReportId, allGeneratedReports, charts, tables, chartThumbnails]);

    // Keep local content in sync with Redux whenever content updates (streaming, completion, or switching)
    useEffect(() => {
        if (currentReport && !isEditMode) {
            setGeneratedReport(currentReport.content || '');
        }
    }, [currentReport?.id, currentReport?.content, isEditMode]);

    // Auto-refresh chart images when underlying table data changes
    // This enables real-time chart updates in reports when data is streaming
    const tableRowSignaturesRef = useRef<Map<string, string>>(new Map());
    
    useEffect(() => {
        if (!currentReportId) return;
        
        const currentReport = allGeneratedReports.find(r => r.id === currentReportId);
        if (!currentReport) return;
        
        // Get all tables referenced by the report's charts
        const reportChartIds = currentReport.selectedChartIds;
        const affectedTableIds = new Set<string>();
        
        reportChartIds.forEach(chartId => {
            const chart = charts.find(c => c.id === chartId);
            if (chart) {
                affectedTableIds.add(chart.tableRef);
            }
        });
        
        // Check if any affected tables have changed
        let hasChanges = false;
        affectedTableIds.forEach(tableId => {
            const table = tables.find(t => t.id === tableId);
            if (table) {
                // Use contentHash if available (set by state management), otherwise fallback to lightweight rowCount
                // This avoids expensive JSON.stringify operations on every table change during streaming updates
                const signature = table.contentHash || `${table.rows.length}`;
                
                const prevSignature = tableRowSignaturesRef.current.get(tableId);
                if (prevSignature && prevSignature !== signature) {
                    hasChanges = true;
                }
                tableRowSignaturesRef.current.set(tableId, signature);
            }
        });
        
        if (hasChanges) {
            reportChartIds.forEach(chartId => {
                const chart = charts.find(c => c.id === chartId);
                if (!chart) return;
                
                const chartTable = tables.find(t => t.id === chart.tableRef);
                if (!chartTable) return;
                
                if (chart.chartType === 'Table' || chart.chartType === '?') {
                    return;
                }

                const cached = getCachedChart(chart.id);
                if (cached?.svg) {
                    const blob = new Blob([cached.svg], { type: 'image/svg+xml;charset=utf-8' });
                    const { width, height } = embedDimsFor(chart.id);
                    updateCachedReportImages(chart.id, URL.createObjectURL(blob), width, height);
                } else if (chartThumbnails[chart.id]) {
                    const { width, height } = embedDimsFor(chart.id);
                    updateCachedReportImages(chart.id, chartThumbnails[chart.id], width, height);
                }
            });
        }
    }, [tables, currentReportId, allGeneratedReports, charts]);


    const deleteReport = (reportId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering the card click
        dispatch(dfActions.deleteGeneratedReport(reportId));
        
        // If we're deleting the currently viewed report, switch to another report or clear the view
        if (currentReportId === reportId) {
            const remainingReports = allGeneratedReports.filter(r => r.id !== reportId);
            if (remainingReports.length > 0) {
                // Switch to the first remaining report
                loadReport(remainingReports[0].id);
            } else {
                // No reports left, go back to editor
                setCurrentReportId(undefined);
                setGeneratedReport('');
                dispatch(dfActions.setViewMode('editor'));
            }
        }
    };

    const rawContent = isEditMode ? generatedReport : (currentReport?.content || generatedReport);
    let displayedReport = processReport(rawContent);

    // Raw markdown (fence stripped) for the lightweight typewriter view while streaming.
    const rawReportMarkdown = (() => {
        const m = rawContent.match(/```markdown\r?\n([\s\S]*?)(?:\r?\n```)?$/);
        return m ? m[1] : rawContent;
    })();

    const downloadMenuItemSx = {
        minHeight: 30,
        px: 1.25,
        py: 0.5,
        fontSize: textVar.sm,
        color: 'text.secondary',
        '& .MuiSvgIcon-root': {
            fontSize: textVar.xl,
            mr: 0.75,
            color: 'text.disabled',
        },
    };

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                    {/* Floating action buttons — left side */}
                    <Box sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}>
                        {!isGenerating && currentReportId && (
                            <Tooltip title={isEditMode ? t('report.doneEditing') : t('report.editReport')} placement="right">
                                <IconButton
                                    size="small"
                                    onClick={() => setIsEditMode((v) => !v)}
                                    sx={isEditMode ? {
                                        ...floatingPillSx,
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': { backgroundColor: 'primary.dark', color: 'primary.contrastText' },
                                    } : floatingPillSx}
                                >
                                    {isEditMode ? <CheckIcon sx={{ fontSize: iconVar.lg }} /> : <EditIcon sx={{ fontSize: iconVar.lg }} />}
                                </IconButton>
                            </Tooltip>
                        )}
                        {!isGenerating && currentReportId && (
                            <Tooltip title={downloadingPdf ? t('report.generatingPdf') : t('report.downloadAndShare')} placement="right">
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={downloadingPdf}
                                        onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                                        sx={downloadMenuAnchor ? {
                                            ...floatingPillSx,
                                            color: 'primary.main',
                                        } : floatingPillSx}
                                    >
                                        {downloadingPdf ? (
                                            <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                                        ) : (
                                            <DownloadIcon sx={{ fontSize: iconVar.lg }} />
                                        )}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <Menu
                            anchorEl={downloadMenuAnchor}
                            open={Boolean(downloadMenuAnchor)}
                            onClose={() => setDownloadMenuAnchor(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                            slotProps={{
                                paper: {
                                    sx: {
                                        ml: 0.5,
                                        borderRadius: '6px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                    }
                                }
                            }}
                        >
                            <MenuItem
                                disabled={downloadingPdf}
                                onClick={() => {
                                    setDownloadMenuAnchor(null);
                                    void exportReportAsPdf();
                                }}
                                sx={downloadMenuItemSx}
                            >
                                {downloadingPdf ? (
                                    <CircularProgress size={18} sx={{ mr: 0.75 }} />
                                ) : (
                                    <PictureAsPdfIcon />
                                )}
                                {t('report.downloadPdf')}
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setDownloadMenuAnchor(null);
                                    void exportReportAsDocx();
                                }}
                                sx={downloadMenuItemSx}
                            >
                                <DescriptionOutlinedIcon />
                                {t('report.downloadWord')}
                            </MenuItem>
                        </Menu>
                        {currentReportId && (
                            <Tooltip title={t('report.deleteReport')} placement="right">
                                <IconButton
                                    size="small"
                                    onClick={(e) => deleteReport(currentReportId, e)}
                                    sx={{
                                        ...floatingPillSx,
                                        color: 'error.main',
                                        '&:hover': { backgroundColor: 'error.50', color: 'error.main' },
                                    }}
                                >
                                    <DeleteIcon sx={{ fontSize: iconVar.lg }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                    {/* Continuous canvas — content flows cleanly */}
                    <Box sx={{ 
                        height: '100%', overflow: 'auto', 
                        display: 'flex', justifyContent: 'center',
                    }}>
                        <Box
                            data-report-content
                            sx={{
                                width: '100%',
                                maxWidth: '816px',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 'fit-content',
                                alignSelf: 'flex-start',
                            }}
                        >
                            <TiptapReportEditor
                                content={displayedReport}
                                streamingText={rawReportMarkdown}
                                resolveChartImage={(chartId) => cachedReportImages[chartId]}
                                editable={isEditMode && !isGenerating}
                                isGenerating={isGenerating}
                                generatingPhase={currentReport?.generatingPhase}
                                inspectionSteps={currentReport?.inspectionSteps}
                                reportId={currentReportId}
                                onUpdate={(html) => {
                                    if (currentReportId) {
                                        setGeneratedReport(html);
                                        dispatch(dfActions.updateGeneratedReportContent({ id: currentReportId, content: html }));
                                    }
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
    );
};

