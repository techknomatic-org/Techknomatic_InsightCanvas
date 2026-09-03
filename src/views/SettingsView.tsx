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
        dispatch(dfActions.setDataSourceSidebarOpen(false));
    }, [dispatch]);

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

    const navItems: { key: SettingsTabType; label: string; icon: React.ReactNode }[] = [
        {
            key: 'models',
            label: t('model.selectModel', { defaultValue: 'Select a model' }),
            icon: <SmartToyOutlinedIcon sx={{ fontSize: 20 }} />,
        },
        {
            key: 'general',
            label: t('config.generalSettings', { defaultValue: 'General' }),
            icon: <SettingsOutlinedIcon sx={{ fontSize: 20 }} />,
        },
        {
            key: 'knowledge',
            label: t('knowledge.title', { defaultValue: 'Agent Knowledge' }),
            icon: <LightbulbOutlinedIcon sx={{ fontSize: 20 }} />,
        },
        {
            key: 'logs',
            label: t('logs.title', { defaultValue: 'Backend Log' }),
            icon: <TerminalOutlinedIcon sx={{ fontSize: 20 }} />,
        },
    ];

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
                    maxWidth: 1020,
                    width: '100%',
                    mx: 'auto',
                    px: { xs: 2, sm: 3 },
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
                                    {t('app.settings', { defaultValue: 'Settings' })}
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

                    {/* ── Two-Card Layout: Left Sidebar Card & Right Detail Content Card ── */}
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        minHeight: 0,
                        overflow: 'hidden',
                        alignItems: 'stretch',
                    }}>
                        {/* 1. Left Navigation Sidebar Card */}
                        <Card
                            variant="outlined"
                            sx={{
                                width: { xs: '100%', md: 215 },
                                flexShrink: 0,
                                borderRadius: '16px',
                                borderColor: '#e2e8f0',
                                bgcolor: '#ffffff',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                                p: 1.25,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.75,
                                height: { md: '100%' },
                                boxSizing: 'border-box',
                            }}
                        >
                            {navItems.map((item) => {
                                const isSelected = activeTab === item.key;
                                return (
                                    <Box
                                        key={item.key}
                                        onClick={() => {
                                            setActiveTab(item.key);
                                            setSearchParams({ tab: item.key }, { replace: true });
                                        }}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.25,
                                            px: 1.5,
                                            py: 1.15,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            bgcolor: isSelected ? '#eff6ff' : 'transparent',
                                            color: isSelected ? '#1d4ed8' : '#64748b',
                                            fontWeight: isSelected ? 600 : 500,
                                            fontSize: '13.5px',
                                            fontFamily: "'Inter', 'Roboto', sans-serif",
                                            '&:hover': {
                                                bgcolor: isSelected ? '#eff6ff' : '#f8fafc',
                                                color: isSelected ? '#1d4ed8' : '#0f172a',
                                            },
                                        }}
                                    >
                                        <Box sx={{ color: isSelected ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                            {item.icon}
                                        </Box>
                                        <Typography sx={{ fontSize: '13.5px', fontWeight: 'inherit', color: 'inherit' }}>
                                            {item.label}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Card>

                        {/* 2. Right Detail Content Card */}
                        <Card
                            id="tour-settings-container"
                            variant="outlined"
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '16px',
                                borderColor: '#e2e8f0',
                                bgcolor: '#ffffff',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                                overflow: 'hidden',
                                minHeight: 0,
                                height: { md: '100%' },
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* ── Tab 1: Select a Model ── */}
                            {activeTab === 'models' && (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                                    <ModelSelectionContent />
                                </Box>
                            )}

                            {/* ── Tab 2: General Settings ── */}
                            {activeTab === 'general' && (
                                <Box sx={{
                                    px: { xs: 2.5, md: 3.5 },
                                    pt: { xs: 2.5, md: 3 },
                                    pb: { xs: 2.5, md: 3 },
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
                                                    error={maxStretchFactor < 1 || maxStretchFactor > 5}
                                                    helperText={maxStretchFactor < 1 || maxStretchFactor > 5 ?
                                                        t('config.stretchFactorRangeError', { defaultValue: 'Must be between 1 and 5' }) : ""}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 0.5 }} />

                                    {/* Backend & Execution Section */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                        <Typography sx={{
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            fontFamily: "'Inter', 'Roboto', sans-serif",
                                        }}>
                                            {t('config.backend', { defaultValue: 'Backend & Execution' })}
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <TextField
                                                    label={t('config.executionTimeout', { defaultValue: 'Agent Code Execution Timeout (seconds)' })}
                                                    type="number"
                                                    size="small"
                                                    variant="outlined"
                                                    value={formulateTimeoutSeconds}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        setFormulateTimeoutSeconds(value);
                                                    }}
                                                    fullWidth
                                                    slotProps={{
                                                        input: {
                                                            inputProps: { min: 10, max: 3600 }
                                                        }
                                                    }}
                                                    error={formulateTimeoutSeconds <= 0 || formulateTimeoutSeconds > 3600}
                                                    helperText={formulateTimeoutSeconds <= 0 || formulateTimeoutSeconds > 3600 ?
                                                        t('config.timeoutRangeError', { defaultValue: 'Must be between 10 and 3600 seconds' }) : ""}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* Action Buttons */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto', pt: 3, borderTop: '1px solid #f1f5f9' }}>
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
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', pt: 2.5, px: 1, pb: 1 }}>
                                    <KnowledgePanel />
                                </Box>
                            )}

                            {/* ── Tab 4: Backend Logs ── */}
                            {activeTab === 'logs' && (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', pt: 2.5, px: 1, pb: 1 }}>
                                    <LogViewerContent maxHeight="calc(100vh - 280px)" />
                                </Box>
                            )}
                        </Card>
                    </Box>
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
