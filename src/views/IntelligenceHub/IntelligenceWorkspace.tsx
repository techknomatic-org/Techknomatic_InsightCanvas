// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    IconButton,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import HistoryIcon from '@mui/icons-material/History';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import {
    DataProfile,
    DashboardSuggestion,
    DashboardSpec,
    IntelligenceSession,
    ChatMessage,
} from './intelligenceTypes';
import {
    fetchSuggestions,
    generateDashboard,
    queryDashboardFilter,
    sendChatMessage,
    listSessions,
    loadSessionDetail,
    saveSession,
    deleteSession,
    generateExecutiveReport,
} from './intelligenceService';

import { RecentSessionsSidebar } from './RecentSessionsSidebar';
import { SuggestionPanel } from './SuggestionPanel';
import { DashboardFilterBar } from './DashboardFilterBar';
import { KpiGrid } from './KpiGrid';
import { VisualizationGrid } from './VisualizationGrid';
import { ChatPanel } from './ChatPanel';
import { IntelligenceReportDialog } from './IntelligenceReportDialog';
import { downloadDashboardImage, downloadDashboardPdf } from './dashboardExport';

interface IntelligenceWorkspaceProps {
    sourceId: string;
    databaseName: string;
    tableNames: string[];
    profile: DataProfile;
    onReset: () => void;
    onBack?: () => void;
    modelConfig?: any;
}

export const IntelligenceWorkspace: React.FC<IntelligenceWorkspaceProps> = ({
    sourceId,
    databaseName,
    tableNames,
    profile,
    onReset,
    onBack,
    modelConfig,
}) => {
    // State
    const [suggestions, setSuggestions] = useState<DashboardSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(true);

    const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
    const [generatingDashboard, setGeneratingDashboard] = useState<boolean>(false);
    const [filtering, setFiltering] = useState<boolean>(false);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState<boolean>(false);

    // Assistant floating modal state
    const [showAssistant, setShowAssistant] = useState<boolean>(false);

    // Sessions Sidebar state (closed by default)
    const [sessions, setSessions] = useState<IntelligenceSession[]>([]);
    const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState<boolean>(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Executive Report Dialog state
    const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false);
    const [reportLoading, setReportLoading] = useState<boolean>(false);
    const [reportMarkdown, setReportMarkdown] = useState<string>('');
    const [reportTitle, setReportTitle] = useState<string>('');
    const [reportError, setReportError] = useState<string | null>(null);

    // Export menu anchor
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
    const exportOpen = Boolean(exportAnchorEl);

    const [error, setError] = useState<string | null>(null);
    const dashboardCanvasRef = useRef<HTMLDivElement>(null);

    // 1. Initial Load: Fetch Suggestions & List Sessions
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const [suggs, sessList] = await Promise.all([
                    fetchSuggestions(profile, modelConfig),
                    listSessions().catch(() => []),
                ]);
                if (mounted) {
                    setSuggestions(suggs);
                    setSessions(sessList);
                    setLoadingSuggestions(false);
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err?.message || 'Failed to generate suggestions');
                    setLoadingSuggestions(false);
                }
            }
        };

        init();
        return () => {
            mounted = false;
        };
    }, [profile, modelConfig]);

    // 2. Generate Dashboard from Prompt or Suggestion
    const handleGenerate = async (prompt: string, titleHint?: string) => {
        setError(null);
        setGeneratingDashboard(true);
        // Clear previous report cache when new dashboard generated
        setReportMarkdown('');

        const newMsg: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            content: prompt,
            timestamp: new Date().toISOString(),
        };
        const updatedChat = [...chatMessages, newMsg];
        setChatMessages(updatedChat);

        try {
            const result = await generateDashboard(profile, prompt, modelConfig);
            setDashboard(result);

            const assistantMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: `Generated ${result.title || titleHint || 'dashboard'}: ${result.description || 'All 4 KPIs and 6 visualizations populated.'}`,
                timestamp: new Date().toISOString(),
            };
            const finalChat = [...updatedChat, assistantMsg];
            setChatMessages(finalChat);

            // Auto-save session
            const saved = await saveSession({
                id: activeSessionId || undefined,
                title: result.title || titleHint || 'Intelligence Dashboard',
                source_id: sourceId,
                database: databaseName,
                tables: tableNames,
                profile,
                dashboard: result,
                prompt,
                chat_history: finalChat,
            });
            setActiveSessionId(saved.id);
            const freshSessions = await listSessions();
            setSessions(freshSessions);
        } catch (err: any) {
            const errMsg = err?.message || 'Failed to generate dashboard';
            setError(errMsg);
            const assistantErrMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: `I cannot generate this dashboard: ${errMsg}`,
                timestamp: new Date().toISOString(),
            };
            setChatMessages([...updatedChat, assistantErrMsg]);
        } finally {
            setGeneratingDashboard(false);
        }
    };

    // 3. Handle Filter Changes
    const handleFilterChange = async (val: string | number) => {
        if (!dashboard) return;
        setFiltering(true);
        try {
            const updated = await queryDashboardFilter(dashboard, val);
            setDashboard(updated);
        } catch (err: any) {
            setError(err?.message || 'Failed to apply filter slice');
        } finally {
            setFiltering(false);
        }
    };

    // 4. Handle Chat Follow-ups / Refinements
    const handleSendChatMessage = async (msgText: string) => {
        if (!dashboard) {
            handleGenerate(msgText);
            return;
        }

        const userMsg: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            content: msgText,
            timestamp: new Date().toISOString(),
        };
        const updatedChat = [...chatMessages, userMsg];
        setChatMessages(updatedChat);
        setChatLoading(true);

        try {
            const { reply, dashboard: updatedDashboard } = await sendChatMessage(
                dashboard,
                msgText,
                profile,
                chatMessages,
                modelConfig
            );

            setDashboard(updatedDashboard);
            const assistantMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: reply,
                timestamp: new Date().toISOString(),
            };
            const finalChat = [...updatedChat, assistantMsg];
            setChatMessages(finalChat);

            // Update persisted session
            if (activeSessionId) {
                await saveSession({
                    id: activeSessionId,
                    title: updatedDashboard.title,
                    dashboard: updatedDashboard,
                    chat_history: finalChat,
                });
            }
        } catch (err: any) {
            const errMsg = err?.message || 'Model request failed';
            setError(errMsg);
            const assistantErrMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: `I encountered an issue updating the dashboard: ${errMsg}. Please try phrasing your request with specific chart or metric names (e.g. "change visual 2 to a pie chart").`,
                timestamp: new Date().toISOString(),
            };
            setChatMessages([...updatedChat, assistantErrMsg]);
        } finally {
            setChatLoading(false);
        }
    };

    // 5. Select & Restore Saved Session
    const handleSelectSession = async (sess: IntelligenceSession) => {
        setSessionsDrawerOpen(false);
        setError(null);
        setActiveSessionId(sess.id);
        setReportMarkdown('');

        try {
            const fullDetail = await loadSessionDetail(sess.id);
            if (fullDetail.dashboard) {
                setDashboard(fullDetail.dashboard);
            }
            if (fullDetail.chat_history) {
                setChatMessages(fullDetail.chat_history);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load session detail');
        }
    };

    // 6. Delete Session
    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
            }
        } catch (err) {
            console.error('Failed to delete session', err);
        }
    };

    // 7. Executive Report Generation
    const handleOpenReport = async () => {
        if (!dashboard) return;
        setReportDialogOpen(true);
        setReportTitle(`Executive Intelligence Report - ${dashboard.title}`);

        // If report already generated for this current dashboard state, don't re-fetch unless requested
        if (reportMarkdown) return;

        setReportLoading(true);
        setReportError(null);

        try {
            const res = await generateExecutiveReport(dashboard, profile, modelConfig);
            setReportMarkdown(res.report);
            if (res.title) setReportTitle(res.title);
        } catch (err: any) {
            setReportError(err?.message || 'Failed to generate executive report');
        } finally {
            setReportLoading(false);
        }
    };

    const handleRegenerateReport = async () => {
        if (!dashboard) return;
        setReportLoading(true);
        setReportError(null);
        try {
            const res = await generateExecutiveReport(dashboard, profile, modelConfig);
            setReportMarkdown(res.report);
            if (res.title) setReportTitle(res.title);
        } catch (err: any) {
            setReportError(err?.message || 'Failed to regenerate executive report');
        } finally {
            setReportLoading(false);
        }
    };

    // 8. Export Dashboard (PDF / JPG / PNG)
    const getCanvasElement = (): HTMLElement | null => {
        return (
            dashboardCanvasRef.current ||
            (document.getElementById('intelligence-dashboard-canvas') as HTMLElement | null)
        );
    };

    const handleExportPdf = async () => {
        const el = getCanvasElement();
        if (!el || !dashboard) return;
        try {
            const filterContext = dashboard.filter
                ? `${dashboard.filter.label || dashboard.filter.field} = ${dashboard.filter.selected_value || 'All'}`
                : undefined;
            await downloadDashboardPdf(el, dashboard.title, filterContext);
        } catch (err: any) {
            setError(err?.message || 'Failed to export dashboard as PDF');
        }
    };

    const handleExportJpg = async () => {
        const el = getCanvasElement();
        if (!el || !dashboard) return;
        try {
            await downloadDashboardImage(el, `${dashboard.title}-Dashboard`, 'jpg');
        } catch (err: any) {
            setError(err?.message || 'Failed to export dashboard as JPG');
        }
    };

    const handleExportPng = async () => {
        const el = getCanvasElement();
        if (!el || !dashboard) return;
        try {
            await downloadDashboardImage(el, `${dashboard.title}-Dashboard`, 'png');
        } catch (err: any) {
            setError(err?.message || 'Failed to export dashboard as PNG');
        }
    };

    // Handle contextual back navigation:
    // If viewing a dashboard (from generation or recent sessions), return to the recommendations landing view.
    // If already on recommendations view, navigate back to table selection.
    const handleBack = () => {
        if (dashboard) {
            setDashboard(null);
            setActiveSessionId(null);
            setChatMessages([]);
        } else {
            if (onBack) {
                onBack();
            } else {
                onReset();
            }
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', bgcolor: '#f8fafc' }}>
            {/* Drawer for Recent Sessions (closed by default) */}
            <RecentSessionsSidebar
                open={sessionsDrawerOpen}
                onClose={() => setSessionsDrawerOpen(false)}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
            />

            {/* Main Content Area */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    p: { xs: 1.5, md: 2.5 },
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    minHeight: 0,
                }}
            >
                {/* Header Bar */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: dashboard ? 2 : 1,
                        flexShrink: 0,
                        flexWrap: 'wrap',
                        gap: 1,
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        bgcolor: '#f8fafc',
                        py: 0.5,
                    }}
                >
                    {/* Top Left: Back Button + Psychology Icon + Title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Tooltip title={dashboard ? "Back to Recommendations & Prompts" : "Back to Table Selection"}>
                            <IconButton
                                onClick={handleBack}
                                size="small"
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    bgcolor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    color: '#1e293b',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        bgcolor: '#f1f5f9',
                                        borderColor: '#cbd5e1',
                                        color: '#001d52',
                                    },
                                }}
                            >
                                <ArrowBackIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                bgcolor: '#001d52',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0, 29, 82, 0.15)',
                            }}
                        >
                            <PsychologyIcon sx={{ fontSize: 20, color: '#38bdf8' }} />
                        </Box>
                        {!dashboard && (
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    color: '#001d52',
                                    fontSize: '18px',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                BI hub
                            </Typography>
                        )}
                    </Box>

                    {/* Top Right Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                        {/* Change Tables action button */}
                        <Button
                            size="small"
                            onClick={onReset}
                            sx={{
                                textTransform: 'none',
                                color: '#64748b',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                '&:hover': { color: '#001d52', bgcolor: 'rgba(0,0,0,0.03)' },
                            }}
                        >
                            Change Tables
                        </Button>

                        {/* Recent Sessions Drawer Button */}
                        <Tooltip title="View saved dashboard sessions">
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                                onClick={() => setSessionsDrawerOpen(true)}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                    bgcolor: '#ffffff',
                                    fontWeight: 600,
                                    fontSize: '12.5px',
                                    px: 1.5,
                                    py: 0.4,
                                }}
                            >
                                Recent Sessions ({sessions.length})
                            </Button>
                        </Tooltip>

                        {/* When dashboard exists: Quick Header Export & Report Buttons */}
                        {dashboard && (
                            <>
                                {/* Executive Report Button in Header */}
                                <Tooltip title="Analyze dashboard KPIs and generate an executive report">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={
                                            reportLoading ? (
                                                <CircularProgress size={14} sx={{ color: '#4F46E5' }} />
                                            ) : (
                                                <AutoAwesomeIcon sx={{ fontSize: 15, color: '#4F46E5' }} />
                                            )
                                        }
                                        onClick={handleOpenReport}
                                        disabled={reportLoading}
                                        sx={{
                                            textTransform: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '12.5px',
                                            borderColor: '#c7d2fe',
                                            color: '#4338ca',
                                            bgcolor: '#eef2ff',
                                            px: 1.5,
                                            py: 0.4,
                                            '&:hover': {
                                                bgcolor: '#e0e7ff',
                                                borderColor: '#818cf8',
                                            },
                                        }}
                                    >
                                        Executive Report
                                    </Button>
                                </Tooltip>

                                {/* Export Dashboard Button in Header */}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                                    endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                    onClick={(e) => setExportAnchorEl(e.currentTarget)}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        borderColor: '#cbd5e1',
                                        color: '#334155',
                                        bgcolor: '#ffffff',
                                        px: 1.5,
                                        py: 0.4,
                                    }}
                                >
                                    Export
                                </Button>

                                <Menu
                                    anchorEl={exportAnchorEl}
                                    open={exportOpen}
                                    onClose={() => setExportAnchorEl(null)}
                                    PaperProps={{
                                        sx: {
                                            borderRadius: '10px',
                                            minWidth: 190,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                                            border: '1px solid #e2e8f0',
                                            mt: 0.8,
                                        },
                                    }}
                                >
                                    <MenuItem
                                        onClick={() => {
                                            setExportAnchorEl(null);
                                            handleExportPdf();
                                        }}
                                        sx={{ py: 1, fontSize: '13px', fontWeight: 500 }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: '#dc2626' }}>
                                            <PictureAsPdfIcon sx={{ fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText primary="Download as PDF" primaryTypographyProps={{ fontSize: '13px', fontWeight: 500 }} />
                                    </MenuItem>

                                    <MenuItem
                                        onClick={() => {
                                            setExportAnchorEl(null);
                                            handleExportJpg();
                                        }}
                                        sx={{ py: 1, fontSize: '13px', fontWeight: 500 }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: '#1B75BB' }}>
                                            <ImageIcon sx={{ fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText primary="Download as JPG" primaryTypographyProps={{ fontSize: '13px', fontWeight: 500 }} />
                                    </MenuItem>

                                    <MenuItem
                                        onClick={() => {
                                            setExportAnchorEl(null);
                                            handleExportPng();
                                        }}
                                        sx={{ py: 1, fontSize: '13px', fontWeight: 500 }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: '#10b981' }}>
                                            <ImageIcon sx={{ fontSize: 18 }} />
                                        </ListItemIcon>
                                        <ListItemText primary="Download as PNG" primaryTypographyProps={{ fontSize: '13px', fontWeight: 500 }} />
                                    </MenuItem>
                                </Menu>
                            </>
                        )}

                        {/* Show/Hide Assistant Button (shown when dashboard is populated) */}
                        {dashboard && (
                            <Button
                                size="small"
                                variant={showAssistant ? 'contained' : 'outlined'}
                                startIcon={<SmartToyOutlinedIcon sx={{ fontSize: 16 }} />}
                                onClick={() => setShowAssistant(!showAssistant)}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '12.5px',
                                    bgcolor: showAssistant ? '#1B75BB' : '#ffffff',
                                    borderColor: showAssistant ? '#1B75BB' : '#1B75BB',
                                    color: showAssistant ? '#ffffff' : '#1B75BB',
                                    boxShadow: showAssistant ? '0 4px 12px rgba(27, 117, 187, 0.2)' : 'none',
                                    px: 1.5,
                                    py: 0.4,
                                    '&:hover': {
                                        bgcolor: showAssistant ? '#145d97' : 'rgba(27, 117, 187, 0.06)',
                                        borderColor: '#1B75BB',
                                    },
                                }}
                            >
                                {showAssistant ? 'Hide KPI Assistance' : 'KPI Assistance'}
                            </Button>
                        )}
                    </Box>
                </Box>

                {dashboard && error && (
                    <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* ============================================================ */}
                {/* 1. PRE-GENERATION LANDING VIEW: Compact & Upside (No Scrollbar) */}
                {/* ============================================================ */}
                {!dashboard && !generatingDashboard && (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            maxWidth: 780,
                            width: '100%',
                            mx: 'auto',
                            pb: 2,
                        }}
                    >
                        {/* Header Greeting */}
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    p: 1,
                                    borderRadius: '12px',
                                    bgcolor: 'rgba(27, 117, 187, 0.08)',
                                    color: '#1B75BB',
                                    mb: 0.8,
                                }}
                            >
                                <AutoAwesomeRoundedIcon sx={{ fontSize: 26 }} />
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#001d52', fontSize: '22px', mb: 0.3 }}>
                                Generate Your Intelligence Dashboard
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12.5px', maxWidth: 480, mx: 'auto' }}>
                                Pick one of the AI-recommended dashboard concepts below or type a custom request with text or voice.
                            </Typography>
                        </Box>

                        {/* Compact Suggestion Cards */}
                        {loadingSuggestions ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, bgcolor: '#ffffff', borderRadius: '10px' }}>
                                <CircularProgress size={18} sx={{ color: '#1B75BB' }} />
                                <Typography variant="caption" color="text.secondary">
                                    Analyzing table schemas and generating intelligent suggestions...
                                </Typography>
                            </Box>
                        ) : (
                            <SuggestionPanel
                                suggestions={suggestions}
                                onSelectSuggestion={(sug) => handleGenerate(sug.prompt, sug.title)}
                                generating={generatingDashboard}
                            />
                        )}

                        {/* Centralized Input Box with Friendly Pop-up Error Support */}
                        <Box sx={{ width: '100%', mt: 0.5 }}>
                            <ChatPanel
                                messages={chatMessages}
                                onSendMessage={handleSendChatMessage}
                                loading={generatingDashboard || chatLoading}
                                loadingText="Synthesizing 4 KPIs and 6 Visualizations..."
                                variant="central"
                                error={error}
                                onClearError={() => setError(null)}
                                onChangeTables={onReset}
                            />
                        </Box>
                    </Box>
                )}

                {/* ============================================================ */}
                {/* 2. LOADING STATE DURING DASHBOARD SYNTHESIS */}
                {/* ============================================================ */}
                {generatingDashboard && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                        <CircularProgress size={40} sx={{ color: '#1B75BB' }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#001d52', fontSize: '18px' }}>
                            Synthesizing Intelligent Dashboard...
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420, textAlign: 'center' }}>
                            Executing analytical DuckDB queries, calculating 4 KPIs, and compiling 6 Vega-Lite charts with dynamic filters.
                        </Typography>
                    </Box>
                )}

                {/* ============================================================ */}
                {/* 3. FULL-SCREEN DASHBOARD VIEW: 1 Filter + 4 KPIs + 6 Charts */}
                {/* ============================================================ */}
                {dashboard && !generatingDashboard && (
                    <Box
                        id="intelligence-dashboard-canvas"
                        ref={dashboardCanvasRef}
                        sx={{
                            width: '100%',
                            pb: 4,
                            bgcolor: '#f8fafc',
                            p: { xs: 1, md: 1.5 },
                            borderRadius: '14px',
                        }}
                    >
                        {/* 1. Dynamic Top Filter Bar with Integrated Export & Report Actions */}
                        {dashboard.filter && (
                            <DashboardFilterBar
                                filter={dashboard.filter}
                                onFilterChange={handleFilterChange}
                                filtering={filtering}
                                dashboardTitle={dashboard.title}
                                dashboardDescription={dashboard.description}
                            />
                        )}

                        {/* 2. 4 KPI Metrics with Colored Accent Bars */}
                        {dashboard.kpis && dashboard.kpis.length > 0 && <KpiGrid kpis={dashboard.kpis} />}

                        {/* 3. 6 Visualizations */}
                        {dashboard.visualizations && dashboard.visualizations.length > 0 && (
                            <VisualizationGrid visualizations={dashboard.visualizations} />
                        )}
                    </Box>
                )}

                {/* ============================================================ */}
                {/* 4. FLOATING AI ASSISTANT WINDOW (For Live Refinements) */}
                {/* ============================================================ */}
                {dashboard && showAssistant && (
                    <ChatPanel
                        messages={chatMessages}
                        onSendMessage={handleSendChatMessage}
                        loading={chatLoading}
                        loadingText="Updating dashboard metrics & charts..."
                        variant="floating"
                        onClose={() => setShowAssistant(false)}
                    />
                )}

                {/* ============================================================ */}
                {/* 5. EXECUTIVE INTELLIGENCE REPORT DIALOG / VIEWER */}
                {/* ============================================================ */}
                <IntelligenceReportDialog
                    open={reportDialogOpen}
                    onClose={() => setReportDialogOpen(false)}
                    reportTitle={reportTitle || `Executive Report - ${dashboard?.title || 'Dashboard'}`}
                    reportMarkdown={reportMarkdown}
                    loading={reportLoading}
                    error={reportError}
                    onRegenerate={handleRegenerateReport}
                    dashboard={dashboard}
                />
            </Box>
        </Box>
    );
};

