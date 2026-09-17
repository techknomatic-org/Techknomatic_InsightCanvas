import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Popover,
    Tooltip,
    Divider,
    ButtonBase,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
} from '@mui/material';
import embed from 'vega-embed';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ImageIcon from '@mui/icons-material/Image';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { VisualizationSpec } from './intelligenceTypes';
import {
    SupportedChartType,
    SUPPORTED_CHART_TYPES,
    CHART_THEME_PRESETS,
    ChartThemePreset,
    rebuildVegaSpec,
    normalizeChartType,
} from './vegaSpecBuilder';
import { downloadVisualImage, downloadVisualCsv } from './dashboardExport';

interface ChartCardProps {
    viz: VisualizationSpec;
    index: number;
    allVisuals?: VisualizationSpec[];
    onUpdateVisualization?: (index: number, updatedViz: VisualizationSpec) => void;
}

const getChartIcon = (type?: string) => {
    switch ((type || '').toLowerCase()) {
        case 'line':
            return <ShowChartIcon sx={{ fontSize: 13 }} />;
        case 'area':
        case 'step_line':
            return <TimelineIcon sx={{ fontSize: 13 }} />;
        case 'pie':
        case 'donut':
            return <PieChartIcon sx={{ fontSize: 13 }} />;
        case 'scatter':
        case 'point':
            return <ScatterPlotIcon sx={{ fontSize: 13 }} />;
        case 'horizontal_bar':
            return <BarChartIcon sx={{ fontSize: 13, transform: 'rotate(90deg)' }} />;
        case 'boxplot':
            return <CandlestickChartIcon sx={{ fontSize: 13 }} />;
        case 'dot_plot':
            return <RadioButtonCheckedIcon sx={{ fontSize: 13 }} />;
        default:
            return <BarChartIcon sx={{ fontSize: 13 }} />;
    }
};

const ChartCard: React.FC<ChartCardProps> = ({ viz, index, allVisuals, onUpdateVisualization }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const hasOriginalData =
        (Array.isArray(viz.data) && viz.data.length > 0) ||
        (Array.isArray(viz.vega_spec?.data?.values) && viz.vega_spec.data.values.length > 0) ||
        (Array.isArray(viz.vega_spec?.layer) && viz.vega_spec.layer.some((l: any) => Array.isArray(l?.data?.values) && l.data.values.length > 0));

    // Find alternative data from sibling visuals if this visual has no records
    const donorViz = !hasOriginalData
        ? allVisuals?.find((v, i) => i !== index && (
            (Array.isArray(v.data) && v.data.length > 0) ||
            (Array.isArray(v.vega_spec?.data?.values) && v.vega_spec.data.values.length > 0)
        ))
        : null;

    const donorData = donorViz
        ? (Array.isArray(donorViz.data) && donorViz.data.length > 0
            ? donorViz.data
            : (donorViz.vega_spec?.data?.values || []))
        : [];

    const effectiveChartType = normalizeChartType(viz.chart_type || 'donut');
    const effectiveThemeId = viz.theme_id || (viz as any).theme_id || 'techknomatic';

    // Build adapted visual if original has no records but sibling has data
    const effectiveViz: VisualizationSpec = React.useMemo(() => {
        if (hasOriginalData || !donorViz || donorData.length === 0) {
            return viz;
        }
        const firstRow = donorData[0] || {};
        const keys = Object.keys(firstRow);
        const xField = donorViz.x_field && keys.includes(donorViz.x_field) ? donorViz.x_field : (keys[0] || 'category');
        const yField = donorViz.y_field && keys.includes(donorViz.y_field) ? donorViz.y_field : (keys[1] || 'value');
        const sliceCount = (effectiveChartType === 'donut' || effectiveChartType === 'pie') ? 7 : 12;
        const adaptedData = donorData.slice(0, sliceCount);

        const baseClean = (viz.title || 'Alternative View').replace(/\s*(?:Breakdown|Distribution|Overview|Analysis|Summary)/gi, '').trim();
        const adaptedTitle = baseClean ? `${baseClean} Overview` : `${xField} Breakdown`;

        const adapted: VisualizationSpec = {
            ...viz,
            title: adaptedTitle,
            description: `Distribution of records segmented by ${xField} (Alternative view)`,
            chart_type: effectiveChartType,
            x_field: xField,
            y_field: yField,
            data: adaptedData,
        };
        const themeObj = CHART_THEME_PRESETS.find((t) => t.id === effectiveThemeId) || CHART_THEME_PRESETS[0];
        adapted.vega_spec = rebuildVegaSpec(adapted, effectiveChartType, themeObj);
        return adapted;
    }, [viz, hasOriginalData, donorViz, donorData, effectiveChartType, effectiveThemeId]);

    const hasData = hasOriginalData || (Array.isArray(effectiveViz.data) && effectiveViz.data.length > 0);

    // Synchronize parent state if adapted
    useEffect(() => {
        if (!hasOriginalData && donorViz && effectiveViz.data && effectiveViz.data.length > 0 && onUpdateVisualization) {
            onUpdateVisualization(index, effectiveViz);
        }
    }, [hasOriginalData, donorViz, index]);

    const currentThemeId = effectiveViz.theme_id || (effectiveViz as any).theme_id || 'techknomatic';
    const [selectedThemeId, setSelectedThemeId] = useState<string>(currentThemeId);

    // Synchronize local theme state if parent passes down a theme_id
    useEffect(() => {
        const tid = effectiveViz.theme_id || (effectiveViz as any).theme_id;
        if (tid) {
            setSelectedThemeId(tid);
        }
    }, [effectiveViz.theme_id, (effectiveViz as any).theme_id]);

    // Anchor element for customization popover
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    // Anchor & state for download menu
    const [downloadAnchorEl, setDownloadAnchorEl] = useState<HTMLElement | null>(null);
    const [downloadingFormat, setDownloadingFormat] = useState<'png' | 'jpg' | 'csv' | null>(null);

    const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleOpenDownloadMenu = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setDownloadAnchorEl(e.currentTarget);
    };

    const handleCloseDownloadMenu = () => {
        setDownloadAnchorEl(null);
    };

    const getVisualData = (v: VisualizationSpec): any[] => {
        if (Array.isArray(v.data) && v.data.length > 0) return v.data;
        if (Array.isArray(v.vega_spec?.data?.values) && v.vega_spec.data.values.length > 0) {
            return v.vega_spec.data.values;
        }
        if (Array.isArray(v.vega_spec?.layer)) {
            for (const l of v.vega_spec.layer) {
                if (Array.isArray(l?.data?.values) && l.data.values.length > 0) {
                    return l.data.values;
                }
            }
        }
        return [];
    };

    const handleDownloadPng = async () => {
        if (!cardRef.current) return;
        setDownloadingFormat('png');
        handleCloseDownloadMenu();
        try {
            await downloadVisualImage(cardRef.current, viz.title || `visual-${index + 1}`, 'png');
        } catch (err) {
            console.error('Failed to download PNG visual:', err);
        } finally {
            setDownloadingFormat(null);
        }
    };

    const handleDownloadJpg = async () => {
        if (!cardRef.current) return;
        setDownloadingFormat('jpg');
        handleCloseDownloadMenu();
        try {
            await downloadVisualImage(cardRef.current, effectiveViz.title || `visual-${index + 1}`, 'jpg');
        } catch (err) {
            console.error('Failed to download JPG visual:', err);
        } finally {
            setDownloadingFormat(null);
        }
    };

    const handleDownloadCsv = () => {
        handleCloseDownloadMenu();
        try {
            const rows = getVisualData(effectiveViz);
            downloadVisualCsv(rows, effectiveViz.title || `visual-${index + 1}-data`);
        } catch (err: any) {
            console.error('Failed to export visual data CSV:', err);
        }
    };

    const handleSelectChartType = (newType: SupportedChartType) => {
        const theme = CHART_THEME_PRESETS.find((t) => t.id === selectedThemeId) || CHART_THEME_PRESETS[0];
        const normalized = normalizeChartType(newType);
        const newVegaSpec = rebuildVegaSpec(effectiveViz, normalized, theme);
        const updatedViz: VisualizationSpec = {
            ...effectiveViz,
            chart_type: normalized,
            theme_id: theme.id,
            vega_spec: newVegaSpec,
        };
        if (onUpdateVisualization) {
            onUpdateVisualization(index, updatedViz);
        }
    };

    const handleSelectTheme = (theme: ChartThemePreset) => {
        setSelectedThemeId(theme.id);
        const currentType = normalizeChartType(effectiveViz.chart_type);
        const newVegaSpec = rebuildVegaSpec(effectiveViz, currentType, theme);
        const updatedViz: VisualizationSpec = {
            ...effectiveViz,
            chart_type: currentType,
            theme_id: theme.id,
            vega_spec: newVegaSpec,
        };
        if (onUpdateVisualization) {
            onUpdateVisualization(index, updatedViz);
        }
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const target = containerRef.current;
        target.innerHTML = '';

        if (!hasData) {
            return;
        }

        let isMounted = true;

        // Determine active theme preset
        const activeTheme = CHART_THEME_PRESETS.find((t) => t.id === selectedThemeId) || CHART_THEME_PRESETS[0];
        const activeType = normalizeChartType(effectiveViz.chart_type);

        // Always compile a verified Vega spec matching active data records and theme
        const baseSpec = rebuildVegaSpec(effectiveViz, activeType, activeTheme);

        // Strip duplicate internal Vega title so only the single styled card header is shown
        const { title: _internalTitle, ...vegaSpecWithoutTitle } = baseSpec;

        // Inject rich responsive config with explicit top padding and safe height
        const specToRender: any = {
            ...vegaSpecWithoutTitle,
            width: 'container',
            height: 220,
            padding: { top: 16, bottom: 8, left: 10, right: 10 },
            autosize: { type: 'fit', contains: 'padding' },
            config: {
                ...(baseSpec.config || {}),
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
                console.warn('Vega embed warning for:', effectiveViz.title, err);
                // Fallback attempt with canvas renderer
                embed(target, specToRender, { actions: false, renderer: 'canvas' }).catch(() => {});
            }
        });

        return () => {
            isMounted = false;
            if (target) target.innerHTML = '';
        };
    }, [effectiveViz.vega_spec, effectiveViz.data, effectiveViz.chart_type, selectedThemeId, hasData]);

    const isMenuOpen = Boolean(anchorEl);
    const activeType = (effectiveViz.chart_type || 'bar').toLowerCase();

    return (
        <Card
            ref={cardRef}
            elevation={0}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 29, 82, 0.03)',
                '&:hover': {
                    boxShadow: '0 8px 24px rgba(27, 117, 187, 0.08)',
                    borderColor: '#93c5fd',
                },
            }}
        >
            <CardContent sx={{ p: 2.2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', lineHeight: 1.3, flex: 1 }}>
                        {effectiveViz.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexShrink: 0 }}>
                        {/* Interactive Chart Type & Theme Trigger */}
                        <Tooltip title="Click to change chart type or color theme" arrow placement="top">
                            <Chip
                                size="small"
                                icon={getChartIcon(effectiveViz.chart_type)}
                                deleteIcon={<KeyboardArrowDownIcon sx={{ fontSize: '14px !important', color: '#1B75BB !important', mr: -0.2 }} />}
                                onDelete={handleOpenMenu}
                                onClick={handleOpenMenu}
                                label={effectiveViz.chart_type || 'chart'}
                                sx={{
                                    height: 22,
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    bgcolor: isMenuOpen ? '#eff6ff' : 'rgba(27, 117, 187, 0.06)',
                                    color: '#1B75BB',
                                    border: '1px solid',
                                    borderColor: isMenuOpen ? '#1B75BB' : 'rgba(27, 117, 187, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    pl: 0.2,
                                    pr: 0.5,
                                    '& .MuiChip-icon': {
                                        color: '#1B75BB',
                                        ml: 0.4,
                                    },
                                    '&:hover': {
                                        bgcolor: '#eff6ff',
                                        borderColor: '#1B75BB',
                                        boxShadow: '0 2px 6px rgba(27, 117, 187, 0.15)',
                                        transform: 'translateY(-1px)',
                                    },
                                }}
                            />
                        </Tooltip>

                        {/* Download Visual Button */}
                        <Tooltip title="Download this visual" arrow placement="top">
                            <IconButton
                                size="small"
                                onClick={handleOpenDownloadMenu}
                                disabled={Boolean(downloadingFormat)}
                                sx={{
                                    width: 22,
                                    height: 22,
                                    p: 0,
                                    color: Boolean(downloadAnchorEl) ? '#1B75BB' : '#64748b',
                                    bgcolor: Boolean(downloadAnchorEl) ? '#eff6ff' : 'rgba(27, 117, 187, 0.06)',
                                    border: '1px solid',
                                    borderColor: Boolean(downloadAnchorEl) ? '#1B75BB' : 'rgba(27, 117, 187, 0.2)',
                                    borderRadius: '6px',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        bgcolor: '#eff6ff',
                                        color: '#1B75BB',
                                        borderColor: '#1B75BB',
                                        transform: 'translateY(-1px)',
                                    },
                                }}
                            >
                                {downloadingFormat ? (
                                    <CircularProgress size={12} sx={{ color: '#1B75BB' }} />
                                ) : (
                                    <DownloadOutlinedIcon sx={{ fontSize: '14px' }} />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {effectiveViz.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', fontSize: '11px', lineHeight: 1.4 }}>
                        {effectiveViz.description}
                    </Typography>
                )}

                {hasData ? (
                    <Box
                        key={`chart-container-${viz.id || index}`}
                        ref={containerRef}
                        sx={{
                            flex: 1,
                            width: '100%',
                            minHeight: 220,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mt: 'auto',
                            overflow: 'visible',
                            '& svg': { maxWidth: '100% !important', overflow: 'visible' },
                        }}
                    />
                ) : (
                    <Box
                        key={`empty-state-${viz.id || index}`}
                        sx={{
                            flex: 1,
                            width: '100%',
                            minHeight: 200,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            textAlign: 'center',
                            bgcolor: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px dashed #e2e8f0',
                            mt: 1,
                        }}
                    >
                        <FilterAltOffOutlinedIcon sx={{ fontSize: 32, color: '#94a3b8', mb: 1, opacity: 0.7 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', fontSize: '12.5px', mb: 0.3 }}>
                            No records available
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px', maxWidth: 220 }}>
                            No matching data for the active filter selection. Try selecting 'All' or a different value.
                        </Typography>
                    </Box>
                )}
            </CardContent>

            {/* Customization Popover */}
            <Popover
                open={isMenuOpen}
                anchorEl={anchorEl}
                onClose={handleCloseMenu}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.8,
                            p: 1.8,
                            width: 320,
                            maxHeight: 480,
                            overflowY: 'auto',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 29, 82, 0.15)',
                            border: '1px solid #e2e8f0',
                        },
                    },
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#001d52', fontSize: '12.5px', mb: 1 }}>
                    Chart Type
                </Typography>

                {/* Chart Types Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.8, mb: 1.8 }}>
                    {SUPPORTED_CHART_TYPES.map((item) => {
                        const isSelected = activeType === item.type;
                        return (
                            <ButtonBase
                                key={item.type}
                                onClick={() => handleSelectChartType(item.type)}
                                sx={{
                                    p: 0.9,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: isSelected ? '#1B75BB' : '#e2e8f0',
                                    bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: 0.8,
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        borderColor: '#1B75BB',
                                        bgcolor: isSelected ? '#eff6ff' : '#f8fafc',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: '6px',
                                        bgcolor: isSelected ? '#1B75BB' : '#f1f5f9',
                                        color: isSelected ? '#ffffff' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    {getChartIcon(item.type)}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontSize: '11.5px',
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? '#1B75BB' : '#334155',
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                </Box>
                            </ButtonBase>
                        );
                    })}
                </Box>

                <Divider sx={{ my: 1.2 }} />

                {/* Color Palette / Theme Presets */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                    <PaletteOutlinedIcon sx={{ fontSize: 15, color: '#1B75BB' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#001d52', fontSize: '12.5px' }}>
                        Color Theme
                    </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.8 }}>
                    {CHART_THEME_PRESETS.map((theme) => {
                        const isSelected = selectedThemeId === theme.id;
                        return (
                            <Tooltip key={theme.id} title={theme.label} arrow placement="top">
                                <ButtonBase
                                    onClick={() => handleSelectTheme(theme)}
                                    sx={{
                                        height: 36,
                                        borderRadius: '8px',
                                        border: '1.5px solid',
                                        borderColor: isSelected ? '#1B75BB' : '#e2e8f0',
                                        bgcolor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.3,
                                        p: 0.4,
                                        position: 'relative',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                            borderColor: '#1B75BB',
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            bgcolor: theme.primaryColor,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {isSelected && <CheckIcon sx={{ fontSize: 12, color: '#ffffff' }} />}
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: '9px',
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? '#1B75BB' : '#64748b',
                                            textAlign: 'center',
                                            lineHeight: 1,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 55,
                                        }}
                                    >
                                        {theme.label.split(' ')[0]}
                                    </Typography>
                                </ButtonBase>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Popover>

            {/* Download Options Menu */}
            <Menu
                anchorEl={downloadAnchorEl}
                open={Boolean(downloadAnchorEl)}
                onClose={handleCloseDownloadMenu}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.5,
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0, 29, 82, 0.12)',
                            border: '1px solid #e2e8f0',
                            py: 0.5,
                            minWidth: 195,
                        },
                    },
                }}
            >
                <MenuItem onClick={handleDownloadPng} sx={{ py: 0.8, px: 1.5, gap: 1.2 }}>
                    <ListItemIcon sx={{ minWidth: 'auto', color: '#1B75BB' }}>
                        <ImageIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Download as PNG"
                        secondary="High-resolution image"
                        primaryTypographyProps={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}
                        secondaryTypographyProps={{ fontSize: '10.5px' }}
                    />
                </MenuItem>
                <MenuItem onClick={handleDownloadJpg} sx={{ py: 0.8, px: 1.5, gap: 1.2 }}>
                    <ListItemIcon sx={{ minWidth: 'auto', color: '#0ea5e9' }}>
                        <CameraAltOutlinedIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Download as JPG"
                        secondary="Compressed image"
                        primaryTypographyProps={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}
                        secondaryTypographyProps={{ fontSize: '10.5px' }}
                    />
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                    onClick={handleDownloadCsv}
                    disabled={getVisualData(viz).length === 0}
                    sx={{ py: 0.8, px: 1.5, gap: 1.2 }}
                >
                    <ListItemIcon sx={{ minWidth: 'auto', color: '#10b981' }}>
                        <TableChartOutlinedIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Export Data (CSV)"
                        secondary={`${getVisualData(viz).length} records`}
                        primaryTypographyProps={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}
                        secondaryTypographyProps={{ fontSize: '10.5px' }}
                    />
                </MenuItem>
            </Menu>
        </Card>
    );
};

interface VisualizationGridProps {
    visualizations: VisualizationSpec[];
    onUpdateVisualization?: (index: number, updatedViz: VisualizationSpec) => void;
}

export const VisualizationGrid: React.FC<VisualizationGridProps> = ({
    visualizations,
    onUpdateVisualization,
}) => {
    const items = visualizations.slice(0, 6);

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                },
                gap: 2.5,
            }}
        >
            {items.map((viz, idx) => (
                <ChartCard
                    key={viz.id || `viz-${idx}`}
                    viz={viz}
                    index={idx}
                    allVisuals={items}
                    onUpdateVisualization={onUpdateVisualization}
                />
            ))}
        </Box>
    );
};
