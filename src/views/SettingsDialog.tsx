// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * SettingsDialog — Unified settings view combining:
 * 1. Select a Model (models)
 * 2. General (general)
 * 3. Agent Knowledge (knowledge)
 * 4. Backend Logs (logs)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';

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

export type SettingsTabType = 'models' | 'general' | 'knowledge' | 'logs';

export interface SettingsDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
    initialTab?: SettingsTabType;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
    open: openProp,
    onOpenChange,
    hideTrigger = false,
    initialTab = 'models',
}) => {
    const [openState, setOpenState] = useState(false);
    const open = openProp ?? openState;
    const setOpen = useCallback((value: boolean) => {
        setOpenState(value);
        onOpenChange?.(value);
    }, [onOpenChange]);

    const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);

    // Sync tab when initialTab changes or when dialog opens
    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);

    const dispatch = useDispatch();
    const { t } = useTranslation();
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

    // Reset local form when config in store updates or dialog opens
    useEffect(() => {
        if (open) {
            setFormulateTimeoutSeconds(config.formulateTimeoutSeconds ?? 180);
            setDefaultChartWidth(config.defaultChartWidth ?? 300);
            setDefaultChartHeight(config.defaultChartHeight ?? 300);
            setMaxStretchFactor(config.maxStretchFactor ?? 1.5);
            setFrontendRowLimit(config.frontendRowLimit ?? rowLimitDefault);
            setPaletteKey((config.paletteKey && palettes[config.paletteKey]) ? config.paletteKey : defaultPaletteKey);
        }
    }, [open, config]);

    const hasChanges = formulateTimeoutSeconds !== config.formulateTimeoutSeconds ||
        defaultChartWidth !== config.defaultChartWidth ||
        defaultChartHeight !== config.defaultChartHeight ||
        maxStretchFactor !== config.maxStretchFactor ||
        frontendRowLimit !== config.frontendRowLimit ||
        paletteKey !== ((config.paletteKey && palettes[config.paletteKey]) ? config.paletteKey : defaultPaletteKey);

    return (
        <>
            {!hideTrigger && (
                <Tooltip title={t('app.settings', { defaultValue: 'Settings' })}>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(true)}
                        aria-label={t('app.settings', { defaultValue: 'Settings' })}
                        sx={{
                            p: 0.5,
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary', backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                        }}
                    >
                        <SettingsOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="lg"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: '12px',
                            minHeight: 620,
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }
                    }
                }}
            >
                {/* Header */}
                <DialogTitle sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 3,
                    py: 1.75,
                    borderBottom: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: 'rgba(37, 99, 235, 0.08)',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <TuneOutlinedIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Typography sx={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: '#0f172a',
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                        }}>
                            {t('app.settings', { defaultValue: 'Settings' })}
                        </Typography>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        aria-label={t('common.close', { defaultValue: 'Close' })}
                        sx={{ color: '#64748b', '&:hover': { color: '#0f172a', bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                {/* Sub-Navigation Tabs: Sequence is Select a Model, General, Agent Knowledge, Backend Logs */}
                <Box sx={{ px: 3, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, value: SettingsTabType) => setActiveTab(value)}
                        aria-label={t('app.settings', { defaultValue: 'Settings' })}
                        sx={{
                            minHeight: 44,
                            '& .MuiTabs-indicator': { height: 2.5, bgcolor: '#2563eb', borderRadius: '2px 2px 0 0' },
                            '& .MuiTab-root': {
                                minWidth: 0,
                                minHeight: 44,
                                px: 2,
                                py: 0,
                                mr: 1,
                                color: '#64748b',
                                fontSize: '13px',
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
                                fontWeight: 600,
                            },
                        }}
                    >
                        {/* 1. Select a Model */}
                        <Tab
                            value="models"
                            icon={<SmartToyOutlinedIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={t('model.selectModel', { defaultValue: 'Select a Model' })}
                        />

                        {/* 2. General */}
                        <Tab
                            value="general"
                            icon={<SettingsOutlinedIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={t('config.generalSettings', { defaultValue: 'General' })}
                        />

                        {/* 3. Agent Knowledge */}
                        <Tab
                            value="knowledge"
                            icon={<LightbulbOutlinedIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={t('knowledge.title', { defaultValue: 'Agent Knowledge' })}
                        />

                        {/* 4. Backend Logs */}
                        <Tab
                            value="logs"
                            icon={<TerminalOutlinedIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={t('logs.title', { defaultValue: 'Backend Logs' })}
                        />
                    </Tabs>
                </Box>

                {/* Content Area */}
                <DialogContent sx={{
                    p: 0,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                }}>
                    {/* ── Tab 1: Select a Model ── */}
                    {activeTab === 'models' && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                            <ModelSelectionContent
                                onClose={() => setOpen(false)}
                                onModelSelected={() => setOpen(false)}
                            />
                        </Box>
                    )}

                    {/* ── Tab 2: General Settings ── */}
                    {activeTab === 'general' && (
                        <Box sx={{
                            p: 3,
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                        }}>
                            {/* Frontend Preferences Section */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <Typography sx={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                }}>
                                    {t('config.frontend', { defaultValue: 'Frontend Interface' })}
                                </Typography>

                                <FormControl fullWidth size="small">
                                    <InputLabel id="palette-select-label" sx={{ fontSize: textVar.md }}>
                                        {t('config.colorTheme', { defaultValue: 'Color Theme' })}
                                    </InputLabel>
                                    <Select
                                        labelId="palette-select-label"
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
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
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
                                pt: 2,
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}>
                                <Button
                                    size="small"
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
                                        fontSize: '13px',
                                        '&:hover': { color: '#0f172a', bgcolor: 'rgba(0,0,0,0.04)' },
                                    }}
                                >
                                    {t('session.resetToDefault', { defaultValue: 'Reset to Defaults' })}
                                </Button>

                                <Box sx={{ flex: 1 }} />

                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setOpen(false)}
                                    sx={{
                                        color: '#64748b',
                                        textTransform: 'none',
                                        fontSize: '13px',
                                        '&:hover': { color: '#0f172a', bgcolor: 'rgba(0,0,0,0.04)' },
                                    }}
                                >
                                    {t('app.cancel', { defaultValue: 'Cancel' })}
                                </Button>
                                <Button
                                    size="small"
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
                                        setOpen(false);
                                    }}
                                    sx={{
                                        bgcolor: '#2563eb',
                                        textTransform: 'none',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        px: 2,
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
                            <LogViewerContent maxHeight="55vh" />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
