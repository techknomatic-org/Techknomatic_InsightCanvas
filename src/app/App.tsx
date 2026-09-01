// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../scss/App.scss';

import { useDispatch, useSelector } from "react-redux";
import {
    DataFormulatorState,
    dfActions,
    dfSelectors,
    fetchGlobalModelList,
    DEFAULT_ROW_LIMIT,
} from './dfSlice'
import { getBrowserId, generateUUID } from './identity';
import type { AuthInfo } from './oidcConfig';
import { OidcCallback } from './OidcCallback';
import { AuthButton } from './AuthButton';
import { IdentityMigrationDialog } from './IdentityMigrationDialog';

import { red, purple, blue, brown, yellow, orange, } from '@mui/material/colors';
import { palettes, defaultPaletteKey, paletteKeys, bgAlpha } from './tokens';

import _ from 'lodash';

import {
    Button,
    Tooltip,
    Typography,
    Box,
    Toolbar,
    Divider,
    DialogTitle,
    Dialog,
    DialogContent,
    Link,
    DialogContentText,
    DialogActions,
    ToggleButtonGroup,
    ToggleButton,
    Menu,
    MenuItem,
    TextField,
    SvgIcon,
    IconButton,
    Select,
    FormControl,
    InputLabel,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    LinearProgress,
} from '@mui/material';


import MuiAppBar from '@mui/material/AppBar';
import { alpha, createTheme, styled, ThemeProvider, useTheme } from '@mui/material/styles';
import LogoutIcon from '@mui/icons-material/Logout';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ClearIcon from '@mui/icons-material/Clear';

import { DataFormulatorFC } from '../views/DataFormulator';
import { LayoutProvider } from './LayoutProvider';
import { MIN_SUPPORTED } from './layout';
import { useAutoSave } from './useAutoSave';
import { useWorkspaceAutoName } from './useWorkspaceAutoName';

import GridViewIcon from '@mui/icons-material/GridView';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
    createBrowserRouter,
    Link as RouterLink,
    Navigate,
    Outlet,
    RouterProvider,
    useLocation,
    useNavigate,
    useRouteError,
    useSearchParams,
} from "react-router-dom";
import { About } from '../views/About';
import { LoginPage } from '../views/LoginPage';
import { IntelligenceHubView } from '../views/IntelligenceHub/IntelligenceHubView';
import { MessageSnackbar } from '../views/MessageSnackbar';
import { ChartRenderService } from '../views/ChartRenderService';
import { DictTable } from '../components/ComponentType';
import { AppDispatch } from './store';
import dfLogo from '../assets/df-logo.svg';
import techknomaticSmallWhiteLogo from '../assets/Techknomatic small white SVG.svg';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import { AnvilLoader } from '../components/AnvilLoader';
import { ModelSelectionButton } from '../views/ModelSelectionDialog';
import { LogViewerDialog } from '../views/LogViewerDialog';
import { SettingsDialog, SettingsTabType } from '../views/SettingsDialog';
import { SettingsView } from '../views/SettingsView';
import { QuickStartGuideModal } from '../views/QuickStartGuideModal';
import { ToolbarActionsContext } from './ToolbarActionsContext';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getUrls } from './utils';
import { apiRequest } from './apiClient';
import { listWorkspaces, loadWorkspace, deleteWorkspace, saveWorkspaceState, onWorkspaceListChanged, WorkspaceLoadSupersededError } from './workspaceService';
import { getSerializableState } from './useAutoSave';
import store, { persistor } from './store';
import { UnifiedDataUploadDialog } from '../views/UnifiedDataUploadDialog';
import ChatIcon from '@mui/icons-material/Chat';
import ArticleIcon from '@mui/icons-material/Article';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import UploadIcon from '@mui/icons-material/Upload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PublicIcon from '@mui/icons-material/Public';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { syncVegaLocale } from '../i18n/vega-locale';
import { buttonVar, iconVar, textVar } from './layout';

// Discord Icon Component
const DiscordIcon: FC<{ sx?: any }> = ({ sx }) => (
    <SvgIcon sx={sx} viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" fill="currentColor" />
    </SvgIcon>
);

const AppBar = styled(MuiAppBar)(({ theme }) => ({
    color: '#ffffff',
    background: 'linear-gradient(90deg, #051b49 0%, #001d52 50%, #012569 100%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'none',
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
}));

const TopNavButton: FC<{ id?: string; to: string; label: string; selected: boolean; onClick?: (e: React.MouseEvent) => void }> = ({ id, to, label, selected, onClick }) => (
    <Button
        id={id}
        component={RouterLink}
        to={to}
        aria-current={selected ? 'page' : undefined}
        onClick={(event) => {
            if (selected) {
                event.preventDefault();
            } else if (onClick) {
                onClick(event);
            }
        }}
        sx={{
            textDecoration: 'none',
            textTransform: 'none',
            fontSize: '13px',
            fontWeight: selected ? 600 : 500,
            border: 'none',
            borderRadius: '8px',
            px: 1.5,
            py: 0.35,
            minWidth: 'auto',
            cursor: selected ? 'default' : 'pointer',
            color: '#ffffff',
            backgroundColor: selected ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            fontFamily: "'Inter', 'Roboto', sans-serif",
            transition: 'all 0.15s ease',
            '&:hover': {
                color: '#ffffff',
                backgroundColor: selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)',
            },
        }}
    >
        {label}
    </Button>
);

declare module '@mui/material/styles' {
    interface PaletteColor {
        bgcolor?: string;
        textColor?: string;
    }
    interface SimplePaletteColorOptions {
        bgcolor?: string;
        textColor?: string;
    }
    interface Palette {
        derived: Palette['primary'];
        custom: Palette['primary'];
    }
    interface PaletteOptions {
        derived: PaletteOptions['primary'];
        custom: PaletteOptions['primary'];
    }
}

export const toolName = "InsightCanvas"

const LANGUAGE_LABELS: Record<string, string> = {
    en: 'EN',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    fr: 'FR',
    de: 'DE',
};

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const availableLanguages = useSelector(
        (state: DataFormulatorState) => state.serverConfig.AVAILABLE_LANGUAGES
    );

    if (!availableLanguages || availableLanguages.length <= 1) return null;

    return (
        <ToggleButtonGroup
            value={i18n.language.split('-')[0]}
            exclusive
            onChange={(_, value) => value && i18n.changeLanguage(value)}
            size="small"
            sx={{
                height: '28px',
                my: 'auto',
                '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontSize: textVar.sm,
                    py: 0,
                    minWidth: '40px',
                    color: 'text.secondary',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                        color: 'text.primary',
                    },
                },
            }}
        >
            {availableLanguages.map(lang => (
                <ToggleButton key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
};

/**
 * Below this toolbar width the app bar collapses to a phone-style layout:
 * the page switcher becomes a dropdown and the trailing controls fold into
 * a single overflow menu. Measured on the toolbar itself (not the viewport)
 * because the app shell floors its content width and scrolls horizontally.
 */
const COMPACT_TOOLBAR_WIDTH = 900;

const useIsNarrow = (ref: React.RefObject<HTMLElement | null>, threshold: number) => {
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === 'undefined') return;
        const update = () => setNarrow(element.getBoundingClientRect().width < threshold);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(element);
        return () => ro.disconnect();
    }, [ref, threshold]);
    return narrow;
};

const menuItemSx = { fontSize: textVar.md, minHeight: 34, py: 0.5 };

/** Language options rendered as menu rows for the compact overflow menu. */
const LanguageMenuItems: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
    const { i18n } = useTranslation();
    const availableLanguages = useSelector(
        (state: DataFormulatorState) => state.serverConfig.AVAILABLE_LANGUAGES
    );

    if (!availableLanguages || availableLanguages.length <= 1) return null;
    const current = i18n.language.split('-')[0];

    return (
        <>
            {availableLanguages.map(lang => (
                <MenuItem
                    key={lang}
                    selected={lang === current}
                    onClick={() => { i18n.changeLanguage(lang); onSelect(); }}
                    sx={menuItemSx}
                >
                    <ListItemIcon>
                        {lang === current
                            ? <CheckIcon fontSize="small" />
                            : <TranslateIcon fontSize="small" sx={{ opacity: 0.3 }} />}
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontSize: textVar.md }}>
                        {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                    </ListItemText>
                </MenuItem>
            ))}
        </>
    );
};

/** Compact replacement for the About / App top-nav buttons. */
const PageNavMenu: React.FC<{ isAboutPage: boolean }> = ({ isAboutPage }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const pages = [
        { to: '/about', label: t('appBar.about'), selected: isAboutPage },
        { to: '/app', label: t('appBar.app'), selected: !isAboutPage },
    ];
    const currentLabel = pages.find(page => page.selected)?.label ?? '';

    return (
        <>
            <Button
                color="inherit"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: iconVar.md, color: 'text.secondary' }} />}
                aria-haspopup="menu"
                sx={{
                    textTransform: 'none',
                    minWidth: 0,
                    px: 0.75,
                    gap: 0.25,
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                }}
            >
                <Typography noWrap component="h1" sx={{ fontSize: textVar.xl, fontWeight: 300, letterSpacing: '0.03em' }}>
                    {toolName}
                </Typography>
                <Typography noWrap sx={{ fontSize: textVar.md, color: 'text.secondary' }}>
                    {`: ${currentLabel}`}
                </Typography>
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                {pages.map(page => (
                    <MenuItem
                        key={page.to}
                        selected={page.selected}
                        sx={menuItemSx}
                        onClick={() => {
                            setAnchorEl(null);
                            if (!page.selected) navigate(page.to);
                        }}
                    >
                        <ListItemIcon>
                            {page.selected ? <CheckIcon fontSize="small" /> : null}
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: textVar.md }}>
                            {`${toolName}: ${page.label}`}
                        </ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

const EXTERNAL_LINKS = {
    github: 'https://github.com/microsoft/data-formulator',
    youtube: 'https://youtu.be/3ndlwt0Wi3c',
    pip: 'https://pypi.org/project/data-formulator/',
    discord: 'https://discord.gg/mYCZMQKYZb',
};

/**
 * Phone-style overflow menu holding everything that does not fit in a narrow
 * app bar (language, settings, logs, links, exit).
 */
const ToolbarOverflowMenu: React.FC<{
    items: {
        key: string;
        label: string;
        icon: React.ReactNode;
        href?: string;
        onClick?: () => void;
    }[];
    showLanguages?: boolean;
}> = ({ items, showLanguages = true }) => {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const close = () => setAnchorEl(null);

    return (
        <>
            <Tooltip title={t('appBar.moreOptions', { defaultValue: 'More options' })}>
                <IconButton
                    size="small"
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    aria-haspopup="menu"
                    aria-label={t('appBar.moreOptions', { defaultValue: 'More options' })}
                    sx={{
                        p: 0.5,
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary', backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={close}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { minWidth: 200 } } }}
            >
                {showLanguages && <LanguageMenuItems onSelect={close} />}
                {showLanguages && items.length > 0 && <Divider />}
                {items.map(item => (
                    <MenuItem
                        key={item.key}
                        sx={menuItemSx}
                        {...(item.href
                            ? { component: 'a' as const, href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        onClick={() => { close(); item.onClick?.(); }}
                    >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: textVar.md }}>{item.label}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export interface AppFCProps {
}

// Extract menu components into separate components to prevent full app re-renders
const TableMenu: React.FC = () => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { t } = useTranslation();

    return (
        <>
            <Button
                variant="text"
                onClick={() => setDialogOpen(true)}
                sx={{ textTransform: 'none' }}
            >
                {t('appBar.data')}
            </Button>

            {/* Unified Data Upload Dialog */}
            <UnifiedDataUploadDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                initialTab="menu"
            />
        </>
    );
};


const WorkspacePickerDialog: React.FC<{ open: boolean, onClose: () => void }> = ({ open, onClose }) => {
    const [workspaces, setWorkspaces] = useState<{ id: string, display_name: string, saved_at: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const dispatch = useDispatch();
    const activeWorkspace = useSelector((state: DataFormulatorState) => state.activeWorkspace);
    const { t } = useTranslation();

    const fetchWsList = useCallback(async () => {
        setListLoading(true);
        try {
            const sessions = await listWorkspaces();
            setWorkspaces(sessions as any);
        } catch (e) { /* ignore */ }
        setListLoading(false);
    }, []);

    useEffect(() => {
        if (!open) return;
        fetchWsList();
    }, [open, fetchWsList]);

    useEffect(() => {
        if (!open) return;
        return onWorkspaceListChanged(fetchWsList);
    }, [open, fetchWsList]);

    const handleOpen = async (wsId: string) => {
        if (activeWorkspace?.id === wsId) { onClose(); return; }
        try { await saveWorkspaceState(getSerializableState(store.getState())); } catch { /* best effort */ }
        const wsEntry = workspaces.find(w => w.id === wsId);
        setLoading(true);
        dispatch(dfActions.setSessionLoading({ loading: true, label: t('workspace.openingWorkspace') }));
        onClose();
        try {
            const result = await loadWorkspace(wsId);
            if (result) {
                const displayName = result.displayName || wsEntry?.display_name || wsId;
                dispatch(dfActions.loadState({ ...result.state, activeWorkspace: { id: wsId, displayName, readOnly: result.readOnly } }));
                dispatch(dfActions.addMessages({ timestamp: Date.now(), component: "Workspace", type: "success", value: t('workspace.openedSession', { name: displayName }) }));
            } else {
                dispatch(dfActions.addMessages({ timestamp: Date.now(), component: "Workspace", type: "error", value: t('workspace.failedToOpenWorkspace') }));
            }
        } catch (e) {
            if (e instanceof WorkspaceLoadSupersededError) {
                setLoading(false);
                return;
            }
            dispatch(dfActions.addMessages({ timestamp: Date.now(), component: "Workspace", type: "error", value: t('workspace.failedToOpenWorkspace') }));
        }
        setLoading(false);
        dispatch(dfActions.setSessionLoading({ loading: false }));
    };

    const handleCreate = () => {
        dispatch(dfActions.resetState());
        onClose();
    };

    const handleDelete = async (workspaceId: string) => {
        try {
            await deleteWorkspace(workspaceId);
            setWorkspaces(prev => prev.filter(s => s.id !== workspaceId));
            dispatch(dfActions.addMessages({ timestamp: Date.now(), component: "Workspace", type: "success", value: t('workspace.deletedSession', { name: workspaceId }) }));
        } catch (e) { /* ignore */ }
        setConfirmDelete(null);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('workspace.sessions')}
                <Tooltip title={t('workspace.refreshList')}>
                    <IconButton size="small" onClick={fetchWsList} disabled={listLoading} sx={{ color: 'text.secondary' }}>
                        {listLoading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </DialogTitle>
            <DialogContent sx={{ px: 1 }}>
                {listLoading && workspaces.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
                        <CircularProgress size={28} />
                        <Typography variant="body2" color="text.secondary">{t('workspace.loadingSessions')}</Typography>
                    </Box>
                ) : (
                    <>
                        {/* New session — same row style as session items */}
                        <Box
                            sx={{
                                display: 'flex', alignItems: 'center',
                                px: 1.5, py: 1, mx: 0, my: 0.5, borderRadius: 1, cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' },
                                transition: 'background-color 0.15s',
                            }}
                            onClick={handleCreate}
                        >
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                                {t('workspace.newSession')}
                            </Typography>
                        </Box>
                        {workspaces.length > 0 && <Divider sx={{ my: 0.5 }} />}
                        {workspaces.map(s => (
                            <Box
                                key={s.id}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    px: 1.5, py: 1, mx: 0, my: 0.5, borderRadius: 1, cursor: 'pointer',
                                    backgroundColor: activeWorkspace?.id === s.id ? 'action.selected' : 'transparent',
                                    '&:hover': { backgroundColor: activeWorkspace?.id === s.id ? 'action.selected' : 'action.hover' },
                                    transition: 'background-color 0.15s',
                                }}
                                onClick={() => handleOpen(s.id)}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={activeWorkspace?.id === s.id ? 'bold' : 'normal'} noWrap>
                                        {s.display_name} {activeWorkspace?.id === s.id ? t('workspace.active') : ''}
                                    </Typography>
                                    {s.saved_at && (
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(s.saved_at).toLocaleString()}
                                        </Typography>
                                    )}
                                </Box>
                                {activeWorkspace?.id !== s.id && (
                                    confirmDelete === s.id ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                                            <Button size="small" color="error" sx={{ minWidth: 0, fontSize: textVar.xs, textTransform: 'none' }}
                                                onClick={() => handleDelete(s.id)}>{t('workspace.delete')}</Button>
                                            <Button size="small" sx={{ minWidth: 0, fontSize: textVar.xs, textTransform: 'none' }}
                                                onClick={() => setConfirmDelete(null)}>{t('workspace.cancel')}</Button>
                                        </Box>
                                    ) : (
                                        <Tooltip title={t('workspace.deleteSession')}>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setConfirmDelete(s.id); }} sx={{ color: 'text.secondary' }}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )
                                )}
                            </Box>
                        ))
                        }
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('workspace.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};

const WorkspaceMenu: React.FC = () => {
    const [pickerOpen, setPickerOpen] = useState(false);
    const activeWorkspace = useSelector((state: DataFormulatorState) => state.activeWorkspace);
    const serverConfig = useSelector((state: DataFormulatorState) => state.serverConfig);
    const { t } = useTranslation();
    const diskPersistenceDisabled = false; // all backends support workspace switching

    console.log('Rendering WorkspaceMenu, activeWorkspace:', activeWorkspace, 'serverConfig:', serverConfig); // Debug log for rendering and state
    console.log(serverConfig); // Debug log for serverConfig
    console.log(activeWorkspace); // Debug log for activeWorkspace

    if (!activeWorkspace) return null;

    return (
        <>
            <Tooltip title={t('workspace.sessionTooltip', { name: activeWorkspace?.id || '' })} placement="bottom">
                <Box
                    onClick={() => !diskPersistenceDisabled && setPickerOpen(true)}
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        cursor: 'pointer',
                        px: 1.25,
                        py: 0.5,
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
                        '&:hover .ws-chevron': { opacity: 1 },
                    }}
                >
                    <Typography noWrap sx={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#ffffff !important',
                        maxWidth: 280,
                        letterSpacing: '0.01em',
                        fontFamily: "'Inter', 'Roboto', sans-serif",
                    }}>
                        {activeWorkspace?.displayName || activeWorkspace?.id}
                    </Typography>
                    <KeyboardArrowDownIcon className="ws-chevron" sx={{ fontSize: 18, color: '#ffffff !important', opacity: 0.85, transition: 'opacity 0.15s' }} />
                </Box>
            </Tooltip>
            <WorkspacePickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} />
        </>
    );
};

// Exit the current session and return to the front-page (no workspace).
// Saves work first so the session is recoverable from the workspace picker —
// unless the session is empty, in which case it's discarded rather than left
// behind as an untitled shell in the picker.
const useExitSession = () => {
    const dispatch = useDispatch();
    const state = useSelector((s: DataFormulatorState) => s);
    const sessionEmpty = useSelector(dfSelectors.selectSessionEmpty);

    return useCallback(async () => {
        const workspaceId = state.activeWorkspace?.id;
        if (sessionEmpty) {
            if (workspaceId) {
                try { await deleteWorkspace(workspaceId); } catch { /* may never have been created */ }
            }
        } else {
            try { await saveWorkspaceState(getSerializableState(state)); } catch { /* best effort */ }
        }
        dispatch(dfActions.resetState());
    }, [state, sessionEmpty, dispatch]);
};

const ExitSessionButton: React.FC = () => {
    const { t } = useTranslation();
    const handleExit = useExitSession();

    return (
        <Tooltip title={t('workspace.exitSessionTooltip', { defaultValue: 'Exit session and return to the workspace picker' })} placement="bottom">
            <Button
                size="small"
                variant="text"
                onClick={handleExit}
                startIcon={<LogoutIcon sx={{ fontSize: '18px !important', color: '#ffffff !important' }} />}
                sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: "'Inter', 'Roboto', sans-serif",
                    px: 1.5,
                    py: 0.5,
                    minWidth: 'auto',
                    lineHeight: 1.5,
                    color: '#ffffff !important',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.15s ease',
                    '& .MuiButton-startIcon': {
                        color: '#ffffff !important',
                        mr: 0.75,
                    },
                    '&:hover': {
                        color: '#ffffff !important',
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        borderColor: 'rgba(255, 255, 255, 0.45)',
                    },
                }}
            >
                {t('workspace.exit', { defaultValue: 'Exit' })}
            </Button>
        </Tooltip>
    );
};



const ErrorBoundaryFallback: React.FC = () => {
    const { t } = useTranslation();
    const routeError = useRouteError() as any;
    const [logsOpen, setLogsOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    // Read the desktop flag off the URL rather than the store — the store may be
    // exactly what failed, and this screen has to render regardless.
    const isDesktopApp = new URLSearchParams(window.location.search).get('desktop') === '1';
    const detail = routeError?.message || (typeof routeError === 'string' ? routeError : '');
    const stack = typeof routeError?.stack === 'string' ? routeError.stack : '';
    const mutedActionSx = {
        minWidth: 0, px: 0.5,
        color: 'text.disabled', fontSize: '0.7rem', fontWeight: 400,
        textTransform: 'none',
        '&:hover': { color: 'text.secondary', backgroundColor: 'transparent' },
    } as const;
    return (
        <Box sx={{ width: "100%", height: "100%", display: "flex" }}>
            <Box sx={{
                margin: "150px auto",
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                maxWidth: 640, px: 2,
            }}>
                <Typography color="gray">
                    {t('workspace.errorOccurred')} <Link href="/app">{t('workspace.refreshSession')}</Link>{'. '}{t('workspace.errorPersistHint')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {(detail || stack) && (
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<KeyboardArrowDownIcon sx={{
                                fontSize: 15,
                                transform: detailsOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s',
                            }} />}
                            onClick={() => setDetailsOpen(open => !open)}
                            sx={mutedActionSx}
                        >
                            View error details
                        </Button>
                    )}
                    {isDesktopApp && (
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<TerminalOutlinedIcon sx={{ fontSize: 15 }} />}
                            onClick={() => setLogsOpen(true)}
                            sx={mutedActionSx}
                        >
                            View backend log
                        </Button>
                    )}
                </Box>
                {detailsOpen && (detail || stack) && (
                    <Typography
                        component="pre"
                        sx={{
                            fontFamily: 'var(--df-font-mono)', fontSize: '0.65rem', color: 'text.disabled',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            m: 0, maxHeight: 260, overflowY: 'auto', textAlign: 'left',
                            width: '100%',
                        }}
                    >
                        {[detail, stack].filter(Boolean).join('\n\n')}
                    </Typography>
                )}
                {isDesktopApp && <LogViewerDialog open={logsOpen} onOpenChange={setLogsOpen} hideTrigger />}
            </Box>
        </Box>
    );
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    access_denied: 'auth.ssoErrorAccessDenied',
    invalid_state: 'auth.ssoErrorInvalidState',
    invalid_client: 'auth.ssoErrorInvalidClient',
    token_exchange_failed: 'auth.ssoErrorTokenExchange',
    missing_token_endpoint: 'auth.ssoErrorMissingEndpoint',
};

const AppShell: FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const viewMode = useSelector((state: DataFormulatorState) => state.viewMode);
    const tables = useSelector(dfSelectors.getAllTables);
    const activeWorkspace = useSelector((state: DataFormulatorState) => state.activeWorkspace);
    const dataSourceSidebarOpen = useSelector((state: DataFormulatorState) => state.dataSourceSidebarOpen);
    const serverConfig = useSelector((state: DataFormulatorState) => state.serverConfig);

    useEffect(() => {
        const authError = searchParams.get('auth_error');
        if (!authError) return;
        const i18nKey = AUTH_ERROR_MESSAGES[authError] || 'auth.ssoErrorGeneric';
        dispatch(dfActions.addMessages({
            type: 'error',
            component: 'auth',
            timestamp: Date.now(),
            value: t(i18nKey, { defaultValue: 'SSO login failed. Please contact your administrator.' }),
        }));
        searchParams.delete('auth_error');
        setSearchParams(searchParams, { replace: true });
    }, []);

    // Auto-persist session state to the active workspace (debounced)
    useAutoSave();
    // Auto-name workspace after first table + model are available
    useWorkspaceAutoName();
    const generatedReports = useSelector((state: DataFormulatorState) => state.generatedReports);

    const isAboutPage = location.pathname === '/about';
    const isIntelligenceHubPage = location.pathname.startsWith('/intelligence-hub');
    const isSettingsPage = location.pathname.startsWith('/settings');
    const isAppPage = !isAboutPage && !isIntelligenceHubPage && !isSettingsPage;

    // The desktop canvas (threads, encoding shelf, viz cards) genuinely needs
    // room, so the app shell floors content at MIN_SUPPORTED. Landing and phone
    // workspace views reflow instead; the media override below removes the
    // desktop floor when Thread and Canvas become alternate full-width views.
    const isLandingView = isAppPage && !activeWorkspace;
    const shellMinWidth = isLandingView ? 0 : `${MIN_SUPPORTED.width}px`;

    // Narrow toolbars fold their controls into menus instead of letting the
    // nav buttons, session name and trailing actions overlap.
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const isCompactToolbar = useIsNarrow(toolbarRef, COMPACT_TOOLBAR_WIDTH);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<SettingsTabType>('models');
    const [logsOpen, setLogsOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState<boolean>(true);
    const navigate = useNavigate();
    const exitSession = useExitSession();
    const inSession = isAppPage && !!activeWorkspace;

    const handleLogoClick = useCallback(async () => {
        dispatch(dfActions.setDataSourceSidebarOpen(false));
        if (inSession) {
            await exitSession();
        }
        navigate('/');
    }, [inSession, exitSession, navigate, dispatch]);

    return (
        <Box sx={{
            position: 'absolute',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'auto',
            '& > *': {
                minWidth: shellMinWidth,
                minHeight: `${MIN_SUPPORTED.height}px`,
                '@media (max-width: 700px)': {
                    minWidth: 0,
                },
            },
        }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                overflow: 'hidden'
            }}>
                <AppBar position="static">
                    <Toolbar id="tour-top-nav" ref={toolbarRef} variant="dense" sx={{ height: 48, minHeight: 48, position: 'relative', px: { xs: 1, sm: 2 }, bgcolor: 'transparent' }}>
                        {/* TKS Short White Logo at leftmost corner - Clickable to Landing */}
                        <Box
                            onClick={handleLogoClick}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mr: 2,
                                flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease, transform 0.15s ease',
                                '&:hover': {
                                    opacity: 0.85,
                                    transform: 'scale(1.04)',
                                },
                            }}
                        >
                            <Box
                                component="img"
                                sx={{ height: 28, width: 'auto', objectFit: 'contain' }}
                                alt="Techknomatic"
                                src={techknomaticSmallWhiteLogo}
                            />
                        </Box>

                        {/* Center text: INSIGHT CANVAS - Clickable to Landing */}
                        {!isCompactToolbar && !activeWorkspace && (
                            <Typography
                                noWrap
                                onClick={handleLogoClick}
                                sx={{
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    color: '#ffffff',
                                    letterSpacing: '0.28em',
                                    textTransform: 'uppercase',
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                    userSelect: 'none',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.15s ease',
                                    display: { xs: 'none', md: 'block' },
                                    '&:hover': {
                                        opacity: 0.82,
                                    },
                                }}
                            >
                                INSIGHT CANVAS
                            </Typography>
                        )}

                        {/* Workspace name if in session */}
                        {activeWorkspace && isAppPage && (
                            isCompactToolbar ? (
                                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', mx: 1 }}>
                                    <WorkspaceMenu />
                                </Box>
                            ) : (
                                <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
                                    <WorkspaceMenu />
                                </Box>
                            )
                        )}

                        {/* Right side: Home, About, Intelligence hub, Setting, Exit session & Profile Icon */}
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TopNavButton
                                to="/"
                                label="Home"
                                selected={isLandingView}
                                onClick={async () => {
                                    dispatch(dfActions.setDataSourceSidebarOpen(false));
                                    if (inSession) {
                                        await exitSession();
                                    }
                                }}
                            />
                            <TopNavButton to="/about" label={t('appBar.about', { defaultValue: 'About' })} selected={isAboutPage} />
                            <TopNavButton id="tour-nav-hub" to="/intelligence-hub" label="BI hub" selected={isIntelligenceHubPage} />
                            <TopNavButton id="tour-nav-settings" to="/settings" label={t('app.settings', { defaultValue: 'Settings' })} selected={isSettingsPage} />
                            {inSession && <ExitSessionButton />}
                            <AuthButton />
                        </Box>
                    </Toolbar>
                </AppBar>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', '& > div': { height: '100%' } }}>
                    <ToolbarActionsContext.Provider value={{
                        openSettings: (tab?: SettingsTabType) => {
                            navigate(tab ? `/settings?tab=${tab}` : '/settings');
                        },
                        openLogs: () => {
                            navigate('/settings?tab=logs');
                        },
                        isLocalMode: serverConfig.IS_LOCAL_MODE,
                    }}>
                        <Outlet />
                    </ToolbarActionsContext.Provider>
                </Box>
                {/* Unified Settings dialog containing General Settings, Knowledge & Logs */}
                <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} initialTab={settingsTab} hideTrigger />
                {serverConfig.IS_LOCAL_MODE && (
                    <LogViewerDialog open={logsOpen} onOpenChange={setLogsOpen} hideTrigger />
                )}
                <QuickStartGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
                <MessageSnackbar />
                <ChartRenderService />
            </Box>
        </Box>
    );
}

export const AppFC: FC<AppFCProps> = function AppFC(appProps) {

    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    const rawPaletteKey = useSelector((state: DataFormulatorState) => state.config.paletteKey);
    const activePaletteKey = (rawPaletteKey && palettes[rawPaletteKey]) ? rawPaletteKey : defaultPaletteKey;

    const [configLoaded, setConfigLoaded] = useState(false);
    const [startupLogsOpen, setStartupLogsOpen] = useState(false);
    const isDesktopApp = useMemo(
        () => new URLSearchParams(window.location.search).get('desktop') === '1',
        [],
    );

    useEffect(() => {
        syncVegaLocale();
        const onLangChanged = () => syncVegaLocale();
        i18n.on('languageChanged', onLangChanged);
        return () => { i18n.off('languageChanged', onLangChanged); };
    }, [i18n]);

    useEffect(() => {
        apiRequest(getUrls().APP_CONFIG)
            .then(({ data }) => {
                dispatch(dfActions.setServerConfig(data));
                setConfigLoaded(true);
            });
    }, []);

    // Validate persisted workspace still exists on the backend
    const activeWorkspace = useSelector((state: DataFormulatorState) => state.activeWorkspace);
    const tables = useSelector(dfSelectors.getAllTables);

    // Debug: log persisted state on startup
    useEffect(() => {
        if (configLoaded) {
            console.log('[DEBUG] activeWorkspace:', activeWorkspace);
            console.log('[DEBUG] tables:', tables.length, tables.map(t => ({ id: t.id, virtual: t.virtual, rowLen: t.rows?.length })));

            // Recover orphaned state: content exists but activeWorkspace was lost
            if (!activeWorkspace && !dfSelectors.selectSessionEmpty(store.getState())) {
                const recoveredId = `recovered_${Date.now()}`;
                dispatch(dfActions.setActiveWorkspace({ id: recoveredId, displayName: t('workspace.recoveredSession') }));
            }
        }
    }, [configLoaded]);

    // Unified auth initialisation — driven by /api/auth/info and server IDENTITY
    const [authChecked, setAuthChecked] = useState(false);
    const [migrationBrowserId, setMigrationBrowserId] = useState<string | null>(null);
    const serverConfig = useSelector((state: DataFormulatorState) => state.serverConfig);

    useEffect(() => {
        if (!configLoaded) return;

        (async () => {
            const prevType = localStorage.getItem('df_identity_type');
            const prevBrowserId = localStorage.getItem('df_browser_id');

            let resolvedIdentity: { type: 'user' | 'browser' | 'local'; id: string; displayName?: string } | null = null;

            // Check if the server assigned a fixed identity (e.g. localhost mode)
            const serverIdentity = serverConfig?.IDENTITY;
            if (serverIdentity?.type === 'local' && serverIdentity?.id) {
                resolvedIdentity = { type: 'local', id: serverIdentity.id };
            }

            if (!resolvedIdentity) {
                try {
                    const { getAuthInfo, getOidcUser } = await import('./oidcConfig');
                    const info: AuthInfo | null = await getAuthInfo();

                    if (info?.action === 'backend') {
                        // Backend OIDC — identity from server session
                        try {
                            const { data: status } = await apiRequest(info.status_url || '/api/auth/oidc/status');
                            if (status.authenticated && status.user) {
                                resolvedIdentity = {
                                    type: 'user',
                                    id: String(status.user.sub || status.user.id || 'session_user'),
                                    displayName: typeof status.user.name === 'string' ? status.user.name : undefined,
                                };
                            }
                        } catch {
                            // fall through to browser identity
                        }
                    } else if (info?.action === 'frontend') {
                        // OIDC PKCE — check for an existing session
                        const user = await getOidcUser();
                        if (user && !user.expired) {
                            resolvedIdentity = {
                                type: 'user',
                                id: String(user.profile.sub),
                                displayName: typeof user.profile.name === 'string' ? user.profile.name : undefined,
                            };
                        }
                    } else if (info?.action === 'transparent') {
                        // Azure App Service EasyAuth — headers injected by Azure
                        try {
                            const resp = await fetch('/.auth/me');
                            const result = await resp.json();
                            if (Array.isArray(result) && result.length > 0) {
                                const authData = result[0];
                                const name = authData['user_claims']?.find((item: any) => item.typ === 'name')?.val || '';
                                const userId = authData['user_id'];
                                if (userId) {
                                    resolvedIdentity = { type: 'user', id: userId, displayName: name };
                                }
                            }
                        } catch {
                            // fall through to browser identity
                        }
                    }
                    // 'redirect' and 'none' → browser identity (resolvedIdentity stays null)
                } catch {
                    // fall through to browser identity
                }
            }

            if (!resolvedIdentity) {
                resolvedIdentity = { type: 'browser', id: getBrowserId() };
            }

            dispatch(dfActions.setIdentity(resolvedIdentity));

            try {
                const { data: refreshedConfig } = await apiRequest(getUrls().APP_CONFIG);
                dispatch(dfActions.setServerConfig(refreshedConfig));
            } catch {
                // App config was already loaded; connector status refresh is best-effort.
            }

            // Persist current identity type for next page load
            localStorage.setItem('df_identity_type', resolvedIdentity.type);
            if (resolvedIdentity.type === 'browser') {
                localStorage.setItem('df_browser_id', resolvedIdentity.id);
            }

            // Detect anonymous → authenticated transition
            if (
                prevType === 'browser' &&
                resolvedIdentity.type === 'user' &&
                prevBrowserId
            ) {
                setMigrationBrowserId(prevBrowserId);
            }

            setAuthChecked(true);
        })();
    }, [configLoaded]);

    useEffect(() => {
        document.title = toolName;
        // Load all server-configured models instantly (no connectivity check).
        // Users can verify connectivity via the "Test" button in the model dialog,
        // or errors will surface naturally when a model is first used.
        dispatch(fetchGlobalModelList());
    }, []);

    let theme = createTheme({
        typography: {
            fontFamily: [
                "Arial",
                "Roboto",
                "Helvetica Neue",
                "sans-serif"
            ].join(",")
        },
        // Default Material UI palette
        // Active palette from user config — selectable via Settings dialog
        // Available: material, fluent, vivid, jewel, electric, tealCoral, copilot
        palette: (() => {
            const p = palettes[activePaletteKey];
            const bg = (entry: { main: string; bgcolor?: string }) => entry.bgcolor ?? alpha(entry.main, bgAlpha);
            const tc = (entry: { main: string; textColor?: string }) => entry.textColor ?? entry.main;
            return {
                primary: { main: p.primary.main, bgcolor: bg(p.primary), textColor: tc(p.primary) },
                secondary: { main: p.secondary.main, bgcolor: bg(p.secondary), textColor: tc(p.secondary) },
                derived: { main: p.derived.main, bgcolor: bg(p.derived), textColor: tc(p.derived) },
                custom: { main: p.custom.main, bgcolor: bg(p.custom), textColor: tc(p.custom) },
                warning: { main: p.warning.main },
            };
        })(),
        components: {
            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                },
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        borderRadius: 4,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        '& .MuiButton-startIcon': {
                            marginLeft: 0,
                            marginRight: buttonVar.iconGap,
                        },
                        '& .MuiButton-endIcon': {
                            marginLeft: buttonVar.iconGap,
                            marginRight: 0,
                        },
                    },
                    sizeSmall: {
                        minHeight: buttonVar.heightSmall,
                        padding: `0 ${buttonVar.paddingSmall}`,
                        fontSize: textVar.sm,
                        '& .MuiButton-icon > :nth-of-type(1)': {
                            fontSize: iconVar.sm,
                        },
                    },
                    sizeMedium: {
                        minHeight: buttonVar.heightMedium,
                        padding: `0 ${buttonVar.paddingMedium}`,
                        fontSize: textVar.md,
                        '& .MuiButton-icon > :nth-of-type(1)': {
                            fontSize: iconVar.md,
                        },
                    },
                    text: ({ ownerState, theme: t }) => {
                        const c = ownerState.color;
                        if (c && c !== 'inherit' && c !== 'error' && c !== 'info' && c !== 'success' && c in t.palette) {
                            const p = (t.palette as any)[c];
                            if (p?.textColor) return { color: p.textColor };
                        }
                        return {};
                    },
                    outlined: ({ ownerState, theme: t }) => {
                        const c = ownerState.color;
                        if (c && c !== 'inherit' && c !== 'error' && c !== 'info' && c !== 'success' && c in t.palette) {
                            const p = (t.palette as any)[c];
                            if (p?.textColor) return { color: p.textColor, borderColor: alpha(p.textColor, 0.5) };
                        }
                        return {};
                    },
                },
                variants: [
                    {
                        props: { variant: 'soft' },
                        style: ({ theme: t }) => ({
                            color: (t.palette.primary as any).textColor ?? t.palette.primary.main,
                            backgroundColor: (t.palette.primary as any).bgcolor ?? alpha(t.palette.primary.main, 0.1),
                            '&:hover': {
                                backgroundColor: alpha(t.palette.primary.main, 0.16),
                            },
                        }),
                    },
                    {
                        props: { variant: 'toolbar' },
                        style: ({ theme: t }) => ({
                            color: t.palette.text.secondary,
                            backgroundColor: 'transparent',
                            '&:hover': {
                                color: t.palette.text.primary,
                                backgroundColor: t.palette.action.hover,
                            },
                        }),
                    },
                ],
            },
            MuiIconButton: {
                styleOverrides: {
                    root: ({ ownerState, theme: t }) => {
                        const c = ownerState.color;
                        if (c && c !== 'inherit' && c !== 'default' && c !== 'error' && c !== 'info' && c !== 'success' && c in t.palette) {
                            const p = (t.palette as any)[c];
                            if (p?.textColor) return { color: p.textColor };
                        }
                        return {};
                    },
                },
            },
            MuiLink: {
                styleOverrides: {
                    root: ({ ownerState, theme: t }) => {
                        const c = ownerState.color as string | undefined;
                        if (c && c !== 'inherit' && c in t.palette) {
                            const p = (t.palette as any)[c];
                            if (p?.textColor) return { color: p.textColor };
                        }
                        return {};
                    },
                },
            },
        },
        transitions: {
            duration: {
                shortest: 100,
                shorter: 100,
                short: 100,
                standard: 100,
                complex: 150,
                enteringScreen: 100,
                leavingScreen: 100,
            },
        },
    });

    const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const location = useLocation();

        const isLoggedIn = sessionStorage.getItem('df_logged_in') === 'true';

        if (!isLoggedIn) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        }

        return <>{children}</>;
    };

    const RootRedirect: React.FC = () => {
        const isModelConfigured = !!localStorage.getItem('df_model_configured') || !!localStorage.getItem('df_selected_model');
        return <Navigate to={isModelConfigured ? "/app" : "/app?configure_model=true"} replace />;
    };

    const router = useMemo(() => createBrowserRouter([
        {
            path: "/auth/callback",
            element: <OidcCallback />,
        },
        {
            path: "/login",
            element: <LoginPage />,
        },
        {
            path: "/",
            element: (
                <AuthGuard>
                    <AppShell />
                </AuthGuard>
            ),
            errorElement: <ErrorBoundaryFallback />,
            children: [
                {
                    index: true,
                    element: <RootRedirect />,
                },
                {
                    path: "app",
                    element: <DataFormulatorFC />,
                },
                {
                    path: "intelligence-hub",
                    element: <IntelligenceHubView />,
                },
                {
                    path: "about",
                    element: <About />,
                },
                {
                    path: "settings",
                    element: <SettingsView />,
                },
                {
                    path: "*",
                    element: <DataFormulatorFC />,
                },
            ],
        }
    ]), []);

    return (
        <ThemeProvider theme={theme}>
            <LayoutProvider>
                {configLoaded && authChecked ? (
                    <RouterProvider router={router} />
                ) : (
                    <>
                        <AnvilLoader
                            label="loading InsightCanvas..."
                            action={isDesktopApp ? (
                                <Link
                                    component="button"
                                    type="button"
                                    underline="always"
                                    onClick={() => setStartupLogsOpen(true)}
                                    sx={{
                                        color: 'text.disabled',
                                        fontSize: '0.7rem',
                                        fontWeight: 400,
                                        fontFamily: 'inherit',
                                        '&:hover': { color: 'text.secondary' },
                                    }}
                                >
                                    View backend log
                                </Link>
                            ) : undefined}
                        />
                        {isDesktopApp && (
                            <LogViewerDialog
                                open={startupLogsOpen}
                                onOpenChange={setStartupLogsOpen}
                                hideTrigger
                            />
                        )}
                    </>
                )}
                {migrationBrowserId && (
                    <IdentityMigrationDialog
                        oldBrowserId={migrationBrowserId}
                        onDone={() => setMigrationBrowserId(null)}
                    />
                )}
            </LayoutProvider>
        </ThemeProvider>
    );
}

function stringAvatar(name: string) {
    let displayName = ""
    try {
        let nameSplit = name.split(' ')
        displayName = `${nameSplit[0][0]}${nameSplit.length > 1 ? nameSplit[nameSplit.length - 1][0] : ''}`
    } catch {
        displayName = name ? name[0] : "?";
    }
    return {
        sx: {
            bgcolor: "cornflowerblue",
            width: 36,
            height: 36,
            margin: "auto",
            fontSize: "1rem"
        },
        children: displayName,
    };
}
