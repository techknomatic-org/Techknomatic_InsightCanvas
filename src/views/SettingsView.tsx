// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * SettingsView — Full-page settings view combining:
 * 1. Select a Model (models)
 * 2. General (general)
 * 3. Agent Knowledge (knowledge)
 * 4. Backend Logs (logs)
 *
 * Formatted and adjusted with the Navigation Rail (DataSourceSidebar)
 * matching the Intelligence Hub and main application workspace layout.
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import ClearIcon from '@mui/icons-material/Clear';

import {
    DataFormulatorState,
    dfActions,
    DEFAULT_ROW_LIMIT,
} from '../app/dfSlice';
import { palettes, defaultPaletteKey, paletteKeys } from '../app/tokens';
import { textVar } from '../app/layout';
import { KnowledgePanel } from './KnowledgePanel';
import { LogViewerContent } from './LogViewerDialog';
import { ModelSelectionContent } from './ModelSelectionDialog';
import { DataSourceSidebar } from './DataSourceSidebar';
import { UnifiedDataUploadDialog, UploadTabType } from './UnifiedDataUploadDialog';

export type SettingsTabType = 'models' | 'general' | 'knowledge' | 'logs';

export const SettingsView: React.FC = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();

    // Upload dialog state for the Navigation Rail
    const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
    const [uploadDialogTab, setUploadDialogTab] = useState<UploadTabType>('menu');
    const [connectorRefreshKey, setConnectorRefreshKey] = useState<number>(0);

    // Determine active tab from URL query param `tab` or default to 'models'
    const tabParam = searchParams.get('tab') as SettingsTabType | null;
    const [activeTab, setActiveTab] = useState<SettingsTabType>(
        tabParam && ['models', 'general', 'knowledge', 'logs'].includes(tabParam)
            ? tabParam
            : 'models'
    );

    useEffect(() => {
        if (tabParam && ['models', 'general', 'knowledge', 'logs'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: SettingsTabType) => {
        setActiveTab(newValue);
        setSearchParams({ tab: newValue }, { replace: true });
    };

    const config = useSelector((state: DataFormulatorState) => state.config);
    const rowLimitDefault = DEFAULT_ROW_LIMIT;
    const rowLimitMax = DEFAULT_ROW_LIMIT;

    // ── General Settings state ──────────────────────────────────────────────
    const [formulateTimeoutSeconds, setFormulateTimeoutSeconds] = useState(config.formulateTimeoutSeconds ?? 180);
    const [defaultChartWidth, setDefaultChartWidth] = useState(config.defaultChartWidth ?? 300);
    const [defaultChartHeight, setDefaultChartHeight] = useState(config.defaultChartHeight ?? 300);
    const [maxStretchFactor, setMaxStretchFactor] = useState(config.maxStretchFactor ?? 1.5);
    const [frontendRowLimit, setFrontendRowLimit] = useState(config.frontendRowLimit ?? rowLimitDefault);
    const [paletteKey, setPaletteKey] = useState(
        (config.paletteKey && palettes[config.paletteKey]) ? config.paletteKey : defaultPaletteKey
    );

    useEffect(() => {
        setFormulateTimeoutSeconds(config.formulateTimeoutSeconds ?? 180);
        setDefaultChartWidth(config.defaultChartWidth ?? 300);
        setDefaultChartHeight(config.defaultChartHeight ?? 300);
        setMaxStretchFactor(config.maxStretchFactor ?? 1.5);
        setFrontendRowLimit(config.frontendRowLimit ?? rowLimitDefault);
        setPaletteKey((config.paletteKey && palettes[config.paletteKey]) ? config.paletteKey : defaultPaletteKey);
    }, [config]);

    const hasChanges = formulateTimeoutSeconds !== config.formulateTimeoutSeconds ||
        defaultChartWidth !== config.defaultChartWidth ||
        defaultChartHeight !== config.defaultChartHeight ||
        maxStretchFactor !== config.maxStretchFactor ||
        frontendRowLimit !== config.frontendRowLimit ||
        paletteKey !== ((config.paletteKey && palettes[config.paletteKey]) ? config.paletteKey : defaultPaletteKey);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Left Navigation Rail (DataSourceSidebar) */}
            <DataSourceSidebar
                onOpenUploadDialog={(tab) => {
                    setUploadDialogTab((tab || 'menu') as UploadTabType);
                    setUploadDialogOpen(true);
                }}
                onConnectorsChanged={() => {
                    setConnectorRefreshKey((k) => k + 1);
                }}
                connectorRefreshKey={connectorRefreshKey}
            />

            {/* Main Settings Page Container */}
            <Box
                component="main"
                role="main"
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    bgcolor: '#f8fafc',
                    background: `
                        radial-gradient(at 0% 0%, rgba(27, 117, 187, 0.04) 0px, transparent 50%),
                        radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.04) 0px, transparent 50%),
                        linear-gradient(90deg, ${alpha(theme.palette.text.secondary, 0.02)} 1px, transparent 1px),
                        linear-gradient(0deg, ${alpha(theme.palette.text.secondary, 0.02)} 1px, transparent 1px)
                    `,
                    backgroundSize: '100% 100%, 100% 100%, 20px 20px, 20px 20px',
                }}
            >
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    maxWidth: 1400,
                    width: '100%',
                    mx: 'auto',
                    px: { xs: 2, sm: 3, md: 4 },
                    py: { xs: 2, sm: 2.5 },
                    minHeight: 0,
                    overflow: 'hidden',
                }}>
                    {/* ── Page Header ── */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: 'rgba(37, 99, 235, 0.1)',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <TuneOutlinedIcon sx={{ fontSize: 24 }} />
                            </Box>
                            <Box>
                                <Typography sx={{
                                    fontSize: { xs: '20px', sm: '24px' },
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                    lineHeight: 1.2,
                                }}>
                                    {t('app.settings', { defaultValue: 'Settings & Configuration' })}
                                </Typography>
                                <Typography sx={{
                                    fontSize: '13px',
                                    color: '#64748b',
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                }}>
                                    {t('settings.description', {
                                        defaultValue: 'Configure your AI models, display preferences, knowledge base, and backend system logs.',
                                    })}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* ── Main Container Card with Sub-Navigation Tabs ── */}
                    <Card
                        id="tour-settings-container"
                        variant="outlined"
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                            minHeight: 0,
                        }}
                    >
                        {/* Sub-Navigation Tabs: Sequence is Select a Model, General, Agent Knowledge, Backend Logs */}
                        <Box sx={{ px: 3, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc', flexShrink: 0 }}>
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                aria-label={t('app.settings', { defaultValue: 'Settings' })}
                                sx={{
                                    minHeight: 48,
                                    '& .MuiTabs-indicator': { height: 3, bgcolor: '#2563eb', borderRadius: '3px 3px 0 0' },
                                    '& .MuiTab-root': {
                                        minWidth: 0,
                                        minHeight: 48,
                                        px: 2.5,
                                        py: 0,
                                        mr: 1.5,
                                        color: '#64748b',
                                        fontSize: '13.5px',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        fontFamily: "'Inter', 'Roboto', sans-serif",
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 1,
                                        '&:hover': { color: '#0f172a' },
                                    },
                                    '& .MuiTab-root.Mui-selected': {
                                        color: '#2563eb',
                                        fontWeight: 700,
                                    },
                                }}
                            >
                                {/* 1. Select a Model */}
                                <Tab
                                    value="models"
                                    icon={<SmartToyOutlinedIcon sx={{ fontSize: 19 }} />}
                                    iconPosition="start"
                                    label={t('model.selectModel', { defaultValue: 'Select a Model' })}
                                />

                                {/* 2. General */}
                                <Tab
                                    value="general"
                                    icon={<SettingsOutlinedIcon sx={{ fontSize: 19 }} />}
                                    iconPosition="start"
                                    label={t('config.generalSettings', { defaultValue: 'General' })}
                                />

                                {/* 3. Agent Knowledge */}
                                <Tab
                                    value="knowledge"
                                    icon={<LightbulbOutlinedIcon sx={{ fontSize: 19 }} />}
                                    iconPosition="start"
                                    label={t('knowledge.title', { defaultValue: 'Agent Knowledge' })}
                                />

                                {/* 4. Backend Logs */}
                                <Tab
                                    value="logs"
                                    icon={<TerminalOutlinedIcon sx={{ fontSize: 19 }} />}
                                    iconPosition="start"
                                    label={t('logs.title', { defaultValue: 'Backend Logs' })}
                                />
                            </Tabs>
                        </Box>

                        {/* Content Body */}
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            minHeight: 0,
                            bgcolor: '#ffffff',
                        }}>
                            {/* ── Tab 1: Select a Model ── */}
                            {activeTab === 'models' && (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                                    <ModelSelectionContent />
                                </Box>
                            )}

                            {/* ── Tab 2: General Settings ── */}
                            {activeTab === 'general' && (
                                <Box sx={{
                                    p: { xs: 3, md: 4 },
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3.5,
                                    maxWidth: 900,
                                }}>
                                    {/* Frontend Preferences Section */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <Typography sx={{
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            fontFamily: "'Inter', 'Roboto', sans-serif",
                                        }}>
                                            {t('config.frontend', { defaultValue: 'Frontend Interface' })}
                                        </Typography>

                                        <FormControl fullWidth size="small">
                                            <InputLabel id="page-palette-select-label" sx={{ fontSize: textVar.md }}>
                                                {t('config.colorTheme', { defaultValue: 'Color Theme' })}
                                            </InputLabel>
                                            <Select
                                                labelId="page-palette-select-label"
                                                value={paletteKey}
                                                label={t('config.colorTheme', { defaultValue: 'Color Theme' })}
                                                onChange={(e) => setPaletteKey(e.target.value)}
                                                sx={{ fontSize: textVar.md }}
                                                renderValue={(key: any) => {
                                                    const p = palettes[key];
                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: p.primary.main, flexShrink: 0 }} />
                                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: p.custom.main, flexShrink: 0 }} />
                                                            <Typography sx={{ fontSize: textVar.md, fontFamily: "'Inter', 'Roboto', sans-serif" }}>{p.name}</Typography>
                                                        </Box>
                                                    );
                                                }}
                                            >
                                                {paletteKeys.map(key => {
                                                    const p = palettes[key];
                                                    return (
                                                        <MenuItem key={key} value={key} sx={{ py: 0.75 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1.5 }}>
                                                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: p.primary.main, border: '1px solid rgba(0,0,0,0.1)' }} />
                                                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: p.custom.main, border: '1px solid rgba(0,0,0,0.1)' }} />
                                                            </Box>
                                                            <ListItemText primary={p.name} slotProps={{ primary: { sx: { fontSize: textVar.md, fontFamily: "'Inter', 'Roboto', sans-serif" } } }} />
                                                        </MenuItem>
                                                    );
                                                })}
                                            </Select>
                                        </FormControl>

                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <TextField
                                                    label={t('config.defaultChartWidth', { defaultValue: 'Default Chart Width (px)' })}
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={defaultChartWidth}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        setDefaultChartWidth(value);
                                                    }}
                                                    fullWidth
                                                    slotProps={{
                                                        input: {
                                                            inputProps: { min: 100, max: 1000 }
                                                        }
                                                    }}
                                                    error={defaultChartWidth < 100 || defaultChartWidth > 1000}
                                                    helperText={defaultChartWidth < 100 || defaultChartWidth > 1000 ?
                                                        t('config.chartSizeRangeError', { defaultValue: 'Must be between 100 and 1000 px' }) : ""}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                <ClearIcon fontSize="small" />
                                            </Typography>
                                            <Box sx={{ flex: 1 }}>
                                                <TextField
                                                    label={t('config.defaultChartHeight', { defaultValue: 'Default Chart Height (px)' })}
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={defaultChartHeight}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        setDefaultChartHeight(value);
                                                    }}
                                                    fullWidth
                                                    slotProps={{
                                                        input: {
                                                            inputProps: { min: 100, max: 1000 }
                                                        }
                                                    }}
                                                    error={defaultChartHeight < 100 || defaultChartHeight > 1000}
                                                    helperText={defaultChartHeight < 100 || defaultChartHeight > 1000 ?
                                                        t('config.chartSizeRangeError', { defaultValue: 'Must be between 100 and 1000 px' }) : ""}
                                                />
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <TextField
                                                    label={t('config.localRowLimit', { defaultValue: 'Browser Row Limit' })}
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={frontendRowLimit}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        setFrontendRowLimit(value);
                                                    }}
                                                    fullWidth
                                                    slotProps={{
                                                        input: {
                                                            inputProps: { min: 100, max: rowLimitMax }
                                                        }
                                                    }}
                                                    error={frontendRowLimit < 100 || frontendRowLimit > rowLimitMax}
                                                    helperText={frontendRowLimit < 100 || frontendRowLimit > rowLimitMax ?
                                                        t('config.localRowLimitRangeError', { defaultValue: `Must be between 100 and ${rowLimitMax}` }) :
                                                        t('config.localRowLimitHint', { defaultValue: 'Maximum rows displayed in browser tables' })}
                                                />
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <TextField
                                                    label={t('config.maxStretchFactor', { defaultValue: 'Max Stretch Factor' })}
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={maxStretchFactor}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        setMaxStretchFactor(value);
                                                    }}
                                                    fullWidth
                                                    slotProps={{
                                                        input: {
                                                            inputProps: { min: 1, max: 5, step: 0.1 }
                                                        }
                                                    }}
                                                    error={isNaN(maxStretchFactor) || maxStretchFactor < 1 || maxStretchFactor > 5}
                                                    helperText={isNaN(maxStretchFactor) || maxStretchFactor < 1 || maxStretchFactor > 5 ?
                                                        t('config.maxStretchFactorRangeError', { defaultValue: 'Must be between 1.0 and 5.0' }) :
                                                        t('config.maxStretchFactorHint', { defaultValue: 'Chart card zoom scale limit' })}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 0.5 }} />

                                    {/* Backend Preferences Section */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <Typography sx={{
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            fontFamily: "'Inter', 'Roboto', sans-serif",
                                        }}>
                                            {t('config.backend', { defaultValue: 'Backend & Engine' })}
                                        </Typography>

                                        <TextField
                                            label={t('config.formulateTimeout', { defaultValue: 'Formulate Timeout (seconds)' })}
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            value={formulateTimeoutSeconds}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                setFormulateTimeoutSeconds(value);
                                            }}
                                            inputProps={{ min: 0, max: 3600 }}
                                            error={formulateTimeoutSeconds <= 0 || formulateTimeoutSeconds > 3600}
                                            helperText={formulateTimeoutSeconds <= 0 || formulateTimeoutSeconds > 3600 ?
                                                t('config.formulateTimeoutRangeError', { defaultValue: 'Timeout must be between 1 and 3600 seconds' }) :
                                                t('config.formulateTimeoutHint', { defaultValue: 'Maximum execution time for AI transformation queries' })}
                                            fullWidth
                                        />
                                    </Box>

                                    {/* Save Actions Bar */}
                                    <Box sx={{
                                        mt: 'auto',
                                        pt: 3,
                                        borderTop: '1px solid #f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                    }}>
                                        <Button
                                            size="medium"
                                            variant="text"
                                            onClick={() => {
                                                setFormulateTimeoutSeconds(180);
                                                setDefaultChartWidth(300);
                                                setDefaultChartHeight(300);
                                                setMaxStretchFactor(1.5);
                                                setFrontendRowLimit(rowLimitDefault);
                                                setPaletteKey(defaultPaletteKey);
                                            }}
                                            sx={{
                                                color: '#64748b',
                                                textTransform: 'none',
                                                fontSize: '13.5px',
                                                '&:hover': { color: '#0f172a', bgcolor: 'rgba(0,0,0,0.04)' },
                                            }}
                                        >
                                            {t('session.resetToDefault', { defaultValue: 'Reset to Defaults' })}
                                        </Button>

                                        <Box sx={{ flex: 1 }} />

                                        <Button
                                            size="medium"
                                            variant="contained"
                                            disabled={!hasChanges || isNaN(formulateTimeoutSeconds) || formulateTimeoutSeconds <= 0 || formulateTimeoutSeconds > 3600
                                                || isNaN(defaultChartWidth) || defaultChartWidth <= 0 || defaultChartWidth > 1000
                                                || isNaN(defaultChartHeight) || defaultChartHeight <= 0 || defaultChartHeight > 1000
                                                || isNaN(maxStretchFactor) || maxStretchFactor < 1 || maxStretchFactor > 5
                                                || isNaN(frontendRowLimit) || frontendRowLimit < 100 || frontendRowLimit > rowLimitMax}
                                            onClick={() => {
                                                dispatch(dfActions.setConfig({
                                                    formulateTimeoutSeconds,
                                                    defaultChartWidth,
                                                    defaultChartHeight,
                                                    maxStretchFactor,
                                                    frontendRowLimit,
                                                    paletteKey,
                                                }));
                                            }}
                                            sx={{
                                                bgcolor: '#2563eb',
                                                textTransform: 'none',
                                                fontSize: '13.5px',
                                                fontWeight: 600,
                                                borderRadius: '8px',
                                                px: 3,
                                                py: 1,
                                                '&:hover': { bgcolor: '#1d4ed8' },
                                            }}
                                        >
                                            {t('app.apply', { defaultValue: 'Apply Changes' })}
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            {/* ── Tab 3: Agent Knowledge ── */}
                            {activeTab === 'knowledge' && (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                                    <KnowledgePanel />
                                </Box>
                            )}

                            {/* ── Tab 4: Backend Logs ── */}
                            {activeTab === 'logs' && (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                                    <LogViewerContent maxHeight="calc(100vh - 280px)" />
                                </Box>
                            )}
                        </Box>
                    </Card>
                </Box>
            </Box>

            {/* Upload Dialog for Navigation Rail */}
            <UnifiedDataUploadDialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                initialTab={uploadDialogTab}
                onConnectorsChanged={() => {
                    setConnectorRefreshKey((k) => k + 1);
                }}
            />
        </Box>
    );
};
