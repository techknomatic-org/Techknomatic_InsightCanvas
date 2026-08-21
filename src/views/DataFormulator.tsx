// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import '../scss/App.scss';

import { useDispatch, useSelector } from "react-redux"; /* code change */
import {
    DataFormulatorState,
    dfActions,
    dfSelectors,
} from '../app/dfSlice'

import _ from 'lodash';

import { Allotment, AllotmentHandle } from "allotment";
import "allotment/dist/style.css";

import {
    Typography,
    Box,
    Tooltip,
    Button,
    Divider,
    useTheme,
    useMediaQuery,
    alpha,
    Backdrop,
    Link,
    Select,
    MenuItem,
    TextField,
    Alert,
    Tabs,
    Tab,
} from '@mui/material';
import { borderColor, radius, transition } from '../app/tokens';


import { VisualizationViewFC } from './VisualizationView';
import { AnvilLoader } from '../components/AnvilLoader';

import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { toolName } from '../app/App';
import { DataThread } from './DataThread';
import { MAX_THREAD_COLUMNS } from './threadLayout';
import {
    defaultThreadColumns,
    maxThreadColumnsForWidth,
    maxThreadColumnsForWidthClass,
    threadPaneWidthFor,
} from '../app/layout';
import { iconVar, textVar } from '../app/layout';
import { useContainerSize, useLayout } from '../app/LayoutProvider';

import dfLogo from '../assets/df-logo.svg';
import techknomaticLogo from '../assets/techknomatic-official-logo.svg';
import techknomaticWhiteLogo from '../assets/techknomatic-white.svg';
import heroBg from '../assets/hero-bg-web.png';
import exampleImageTable from "../assets/example-image-table.png";
import { ModelSelectionButton } from './ModelSelectionDialog';
import { UnifiedDataUploadDialog, UploadTabType, DataLoadMenu, ConnectorInstance } from './UnifiedDataUploadDialog';
import { ReportView } from './ReportView';
import { DataSourceSidebar } from './DataSourceSidebar';
import GitHubIcon from '@mui/icons-material/GitHub';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import { ExampleSession, exampleSessions, ExampleSessionCard, fetchExampleSessions } from './ExampleSessions';
import { useToolbarActions } from '../app/ToolbarActionsContext';
import { useDataRefresh, useDerivedTableRefresh } from '../app/useDataRefresh';
import { useTranslation } from 'react-i18next';
import { fetchWithIdentity, getUrls, CONNECTOR_URLS } from '../app/utils';
import { apiRequest } from '../app/apiClient';
import { listWorkspaces, loadWorkspace, deleteWorkspace, exportWorkspace, importWorkspace, onWorkspaceListChanged, updateWorkspaceMeta, WorkspaceLoadSupersededError } from '../app/workspaceService';
import type { WorkspaceSummary } from '../app/workspaceService';
import { AppDispatch, store } from '../app/store';
import { generateUUID } from '../app/identity';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

/** Quick enough not to feel like waiting, slow enough to read as a movement. */
const CANVAS_TRANSITION_MS = 140;

/** Generate a session ID like session_20260408_193052_a1b2 */
function generateSessionId(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const short = generateUUID().slice(0, 4);
    return `session_${date}_${time}_${short}`;
}

export const DataFormulatorFC = ({ }) => {

    const derivedTables = useSelector(dfSelectors.getDerivedTables);
    const hasInputTables = useSelector((state: DataFormulatorState) => state.inputTables.length > 0);
    const activeWorkspace = useSelector((state: DataFormulatorState) => state.activeWorkspace);
    const canvasTarget = useSelector(dfSelectors.selectCanvasTarget);
    const [canvasClosing, setCanvasClosing] = useState(false);
    const models = useSelector(dfSelectors.getAllModels);
    const selectedModelId = useSelector((state: DataFormulatorState) => state.selectedModelId);
    const viewMode = useSelector((state: DataFormulatorState) => state.viewMode);
    const serverConfig = useSelector((state: DataFormulatorState) => state.serverConfig);
    const identityKey = useSelector((state: DataFormulatorState) => `${state.identity.type}:${state.identity.id}`);
    const dataLoadingChatMessages = useSelector((state: DataFormulatorState) => state.dataLoadingChatMessages);
    const sessionEmpty = useSelector(dfSelectors.selectSessionEmpty);
    const theme = useTheme();

    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation();
    const { openSettings, openLogs, isLocalMode } = useToolbarActions();

    // ── Sidebar bottom actions (moved from nav bar) ──────────────
    const sidebarBottomActions = useMemo(() => (
        <>
            <ModelSelectionButton appearance="sidebar" />
            <Tooltip title={t('app.settings', { defaultValue: 'Settings' })} placement="right">
                <IconButton
                    size="small"
                    onClick={() => openSettings?.()}
                    sx={{
                        width: 32, height: 32, borderRadius: '8px',
                        color: '#64748b',
                        '&:hover': { bgcolor: '#f1f5f9', color: '#1B75BB' },
                    }}
                >
                    <SettingsOutlinedIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Tooltip>
            {isLocalMode && (
                <Tooltip title={t('logs.viewLogs', { defaultValue: 'View backend log' })} placement="right">
                    <IconButton
                        size="small"
                        onClick={() => openLogs?.()}
                        sx={{
                            width: 32, height: 32, borderRadius: '8px',
                            color: '#64748b',
                            '&:hover': { bgcolor: '#f1f5f9', color: '#1B75BB' },
                        }}
                    >
                        <TerminalOutlinedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>
            )}
        </>
    ), [t, openSettings, openLogs, isLocalMode]);

    // Auto-focus removed: focus is the only thing that opens the canvas, so
    // re-focusing whenever it clears would make closing impossible. Table
    // creation focuses its own table (see `addTable`).

    // ── Connector instances (for landing page menu) ─────────────
    const [pageConnectors, setPageConnectors] = useState<ConnectorInstance[]>([]);
    const refreshPageConnectors = useCallback(() => {
        apiRequest<any>(CONNECTOR_URLS.LIST, { method: 'GET' })
            .then(({ data }) => setPageConnectors(data.connectors || []))
            .catch(() => { /* connector list is optional on landing page */ });
    }, []);
    const [connectorRefreshKey, setConnectorRefreshKey] = useState(0);
    const handleConnectorsChanged = useCallback(() => {
        setConnectorRefreshKey(k => k + 1);
        refreshPageConnectors();
    }, [refreshPageConnectors]);
    // A connector created from a non-sidebar surface (e.g. the inline
    // connection form in the data-loading chat, design 38) bumps this redux
    // counter; refresh the connector list so the new source appears.
    const connectorRefreshRequest = useSelector((state: DataFormulatorState) => state.connectorRefreshRequest);
    useEffect(() => {
        if (connectorRefreshRequest > 0) {
            handleConnectorsChanged();
        }
    }, [connectorRefreshRequest, handleConnectorsChanged]);
    useEffect(() => {
        setPageConnectors([]);
        refreshPageConnectors();
    }, [refreshPageConnectors, identityKey]);

    // ── Demo sessions (loaded from manifest, fallback to hardcoded) ─────
    const [demoSessions, setDemoSessions] = useState<ExampleSession[]>(exampleSessions);
    useEffect(() => {
        fetchExampleSessions().then(sessions => {
            if (sessions.length > 0) setDemoSessions(sessions);
        });
    }, []);

    // ── Workspace list (shown on landing page) ────────────────────
    const [savedWorkspaces, setSavedWorkspaces] = useState<WorkspaceSummary[]>([]);
    const [confirmDeleteWs, setConfirmDeleteWs] = useState<string | null>(null);

    // Inline rename: which card's title is currently being edited, and
    // its draft text. Persisted via updateWorkspaceMeta on Enter / blur;
    // reverted on Escape.
    const [renamingWs, setRenamingWs] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState<string>('');

    // Sort key for the saved-workspaces grid. Default is creation time
    // so the user's chronological list of work doesn't shuffle every
    // time a workspace is touched.
    type WsSortKey = 'created_desc' | 'created_asc' | 'updated_desc' | 'name_asc';
    const [wsSort, setWsSort] = useState<WsSortKey>('created_desc');

    const fetchWorkspaces = useCallback(async () => {
        try {
            const sessions = await listWorkspaces();
            setSavedWorkspaces(sessions);
        } catch { /* workspace list is best-effort on landing page */ }
    }, []);

    useEffect(() => {
        if (!activeWorkspace) {
            fetchWorkspaces();
        }
    }, [activeWorkspace, fetchWorkspaces]);

    useEffect(() => {
        return onWorkspaceListChanged(fetchWorkspaces);
    }, [fetchWorkspaces]);

    const handleOpenWorkspace = useCallback(async (name: string, metaDisplayName?: string) => {
        dispatch(dfActions.setSessionLoading({ loading: true, label: t('workspace.openingWorkspace') }));
        try {
            const result = await loadWorkspace(name);
            if (result) {
                const displayName = metaDisplayName || result.displayName;
                dispatch(dfActions.loadState({ ...result.state, activeWorkspace: { id: name, displayName, readOnly: result.readOnly } }));
            } else {
                dispatch(dfActions.addMessages({
                    timestamp: Date.now(), type: 'error', component: 'workspace',
                    value: t('workspace.failedToOpenWorkspace'),
                }));
            }
        } catch (error) {
            if (error instanceof WorkspaceLoadSupersededError) return;
            dispatch(dfActions.addMessages({
                timestamp: Date.now(), type: 'error', component: 'workspace',
                value: t('workspace.failedToOpenWorkspace'),
            }));
        }
        dispatch(dfActions.setSessionLoading({ loading: false }));
    }, [dispatch]);

    const handleDeleteWorkspace = useCallback(async (name: string) => {
        try {
            await deleteWorkspace(name);
            setSavedWorkspaces(prev => prev.filter(w => w.id !== name));
        } catch {
            dispatch(dfActions.addMessages({
                timestamp: Date.now(), type: 'error',
                component: 'workspace', value: t('workspace.deleteFailed'),
            }));
        }
        setConfirmDeleteWs(null);
    }, [dispatch]);

    const startRenameWorkspace = useCallback((id: string, currentName: string) => {
        setRenamingWs(id);
        setRenameDraft(currentName);
    }, []);

    const cancelRenameWorkspace = useCallback(() => {
        setRenamingWs(null);
        setRenameDraft('');
    }, []);

    const commitRenameWorkspace = useCallback(async () => {
        const id = renamingWs;
        if (!id) return;
        const next = renameDraft.trim();
        const current = savedWorkspaces.find(w => w.id === id);
        // Bail without writing if nothing changed or the new name is empty.
        if (!current || !next || next === current.display_name) {
            cancelRenameWorkspace();
            return;
        }
        // Optimistic update first so the UI reflects the change instantly;
        // the next list refresh (via onWorkspaceListChanged) will reconcile.
        setSavedWorkspaces(prev =>
            prev.map(w => (w.id === id ? { ...w, display_name: next } : w)),
        );
        cancelRenameWorkspace();
        try {
            await updateWorkspaceMeta(id, next);
        } catch {
            dispatch(dfActions.addMessages({
                timestamp: Date.now(), type: 'error',
                component: 'workspace', value: t('workspace.renameFailed'),
            }));
            // On failure, refetch so the UI returns to the server's truth.
            fetchWorkspaces();
        }
    }, [renamingWs, renameDraft, savedWorkspaces, cancelRenameWorkspace, dispatch, fetchWorkspaces]);

    const handleExportWorkspace = useCallback(async (id: string) => {
        try {
            const blob = await exportWorkspace(id);
            const ws = savedWorkspaces.find(w => w.id === id);
            const fileName = ws?.display_name || id;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${fileName}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            console.warn('Failed to export workspace:', e);
        }
    }, [savedWorkspaces]);

    const importRef = useRef<HTMLInputElement>(null);
    const handleImportWorkspace = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        dispatch(dfActions.setSessionLoading({ loading: true, label: t('workspace.importingFile', { name: file.name }) }));
        try {
            const wsName = file.name.replace(/\.zip$/, '') || 'imported';
            const wsId = generateSessionId();
            const state = await importWorkspace(file, wsId, wsName);
            const restoredName = (state as any).activeWorkspace?.displayName || wsName;
            dispatch(dfActions.loadState({ ...state, activeWorkspace: { id: wsId, displayName: restoredName } }));
        } catch (e) {
            console.warn('Failed to import workspace:', e);
            dispatch(dfActions.addMessages({
                timestamp: Date.now(), type: 'error',
                component: 'workspace',
                value: t('workspace.importFailed'),
            }));
        }
        dispatch(dfActions.setSessionLoading({ loading: false }));
        if (importRef.current) importRef.current.value = '';
    }, [dispatch, t]);

    // Sorted view of saved workspaces. We don't mutate the underlying
    // list (the backend's response is the source of truth); we just
    // produce a re-ordered copy for rendering.
    const sortedSavedWorkspaces = useMemo(() => {
        const cmpDate = (a: string | null | undefined, b: string | null | undefined): number => {
            // Missing timestamps sort last regardless of direction so
            // legacy entries don't dominate either end of the list.
            if (!a && !b) return 0;
            if (!a) return 1;
            if (!b) return -1;
            return a.localeCompare(b);
        };
        const copy = [...savedWorkspaces];
        switch (wsSort) {
            case 'created_desc':
                return copy.sort((a, b) => cmpDate(b.created_at, a.created_at));
            case 'created_asc':
                return copy.sort((a, b) => cmpDate(a.created_at, b.created_at));
            case 'updated_desc':
                return copy.sort((a, b) => cmpDate(b.saved_at, a.saved_at));
            case 'name_asc':
                return copy.sort((a, b) =>
                    (a.display_name || '').localeCompare(b.display_name || ''),
                );
            default:
                return copy;
        }
    }, [savedWorkspaces, wsSort]);

    // Set up automatic refresh of derived tables when source data changes
    useDerivedTableRefresh();

    // State for unified data upload dialog
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadDialogInitialTab, setUploadDialogInitialTab] = useState<UploadTabType>('menu');

    // Loading state for sessions (from Redux, shared with App.tsx)
    const sessionLoading = useSelector((state: DataFormulatorState) => state.sessionLoading);
    const sessionLoadingLabel = useSelector((state: DataFormulatorState) => state.sessionLoadingLabel);

    const openUploadDialog = (tab: UploadTabType) => {
        if (activeWorkspace?.readOnly) return;
        // If no workspace is active, generate an ID (backend creates folder lazily on first data op)
        if (!activeWorkspace) {
            dispatch(dfActions.setActiveWorkspace({ id: generateSessionId(), displayName: 'Untitled Session' }));
        }
        // Compact mode: when opening the generic menu but a data-loading
        // conversation is already in progress, land directly on the chat so
        // the prior history (and any in-progress extractions / load plan) is
        // visible instead of the empty menu hero. Explicit tab requests
        // (connector, upload, paste, …) are respected as-is; the menu's
        // connectors / direct-load options stay one back-arrow click away.
        const resolvedTab = (tab === 'menu' && dataLoadingChatMessages.length > 0)
            ? 'extract'
            : tab;
        setUploadDialogInitialTab(resolvedTab);
        setUploadDialogOpen(true);
    };

    // The dialog needs a workspace id to talk to the backend, but opening it is
    // not entering a session: stay on the landing page until data lands.
    const provisionalSession = uploadDialogOpen && sessionEmpty;

    // Seed the Data Loading chat through the single redux `pending` slot,
    // then navigate to the extract tab. This is the one channel that
    // carries text, images, AND file attachments as first-class fields —
    // replacing the older `initialChatPrompt/Images` props that silently
    // dropped file attachments (they had no dedicated field and only
    // survived if their name was baked into the prompt text).
    const startDataLoadingChat = (text: string, images: string[] = [], attachments: string[] = []) => {
        if (text.trim().length > 0 || images.length > 0 || attachments.length > 0) {
            // Preserve any prior conversation (Option A). `queueDataLoadingTask`
            // drops a "new request" divider when a thread already exists, then
            // enqueues the submission; the user resets explicitly via the
            // header reset button when they want a blank slate.
            dispatch(dfActions.queueDataLoadingTask({ text, images, attachments }));
        }
        openUploadDialog('extract');
    };

    // The landing box starts the unified analyst conversation — loading data is
    // its first skill, so there's no separate loading chat to hand off to.
    const startAnalystChat = (text: string, images: string[] = [], attachments: string[] = []) => {
        if (activeWorkspace?.readOnly) return;
        if (text.trim().length === 0 && images.length === 0 && attachments.length === 0) return;
        // Every agent call carries X-Workspace-Id; the landing page can be used
        // before a workspace exists, so mint one the way openUploadDialog does.
        if (!activeWorkspace) {
            dispatch(dfActions.setActiveWorkspace({ id: generateSessionId(), displayName: 'Untitled Session' }));
        }
        dispatch(dfActions.queueAnalystTask({ text, images, attachments }));
    };

    const handleLoadExampleSession = async (session: ExampleSession) => {
        dispatch(dfActions.setSessionLoading({ loading: true, label: t('messages.loadingExample', { title: session.title }) }));

        dispatch(dfActions.addMessages({
            timestamp: Date.now(),
            type: 'info',
            component: 'InsightCanvas',
            value: t('messages.loadingExample', { title: session.title }),
        }));

        try {
            // Fetch the workspace zip
            const res = await fetch(session.workspace);
            if (!res.ok) throw new Error(`Failed to fetch ${session.workspace}`);
            const blob = await res.blob();
            const file = new File([blob], `${session.id}.zip`, { type: 'application/zip' });

            // Import via the standard workspace import flow (parquet + state)
            const wsId = generateSessionId();
            // Set workspace ID first so fetchWithIdentity sends X-Workspace-Id header
            dispatch(dfActions.setActiveWorkspace({ id: wsId, displayName: session.title }));
            const state = await importWorkspace(file, wsId, session.title);
            dispatch(dfActions.loadState({ ...state, activeWorkspace: { id: wsId, displayName: session.title } }));

            dispatch(dfActions.addMessages({
                timestamp: Date.now(),
                type: 'success',
                component: 'InsightCanvas',
                value: t('messages.loadSuccess', { title: session.title }),
            }));
        } catch (error: any) {
            console.error('Error loading session:', error);
            dispatch(dfActions.addMessages({
                timestamp: Date.now(),
                type: 'error',
                component: 'InsightCanvas',
                value: t('messages.loadFailed', { title: session.title, error: error.message }),
            }));
        } finally {
            dispatch(dfActions.setSessionLoading({ loading: false }));
        }
    };

    useEffect(() => {
        document.title = toolName;

        // Preload imported images (public images are preloaded in index.html)
        const imagesToPreload = [
            { src: dfLogo, type: 'image/svg+xml' },
            { src: exampleImageTable, type: 'image/png' },
        ];

        const preloadLinks: HTMLLinkElement[] = [];
        imagesToPreload.forEach(({ src, type }) => {
            // Use link preload for better priority
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            link.type = type;
            document.head.appendChild(link);
            preloadLinks.push(link);
        });

        // Cleanup function to remove preload links when component unmounts
        return () => {
            preloadLinks.forEach(link => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            });
        };
    }, []);

    useEffect(() => {
        // Auto-select the first available model when none is selected.
        // No connectivity check on load — errors surface on first use,
        // and the user can manually test via the model selection dialog.
        if (selectedModelId === undefined && models.length > 0) {
            dispatch(dfActions.selectModel(models[0].id));
        }
    }, [dispatch, models, selectedModelId]);

    const visPaneMain = (
        <Box sx={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "row" }}>
            <VisualizationViewFC />
        </Box>);

    const visPane = visPaneMain;

    let borderBoxStyle = {
        border: `1px solid ${borderColor.view}`,
        borderRadius: radius.pill,
        //boxShadow: '0 0 5px rgba(0,0,0,0.1)',
    }

    // Discrete column snapping for DataThread.
    // Column geometry is defined once in ./threadLayout and shared with
    // DataThread so the pane snap points line up with the rendered columns.
    const allotmentRef = useRef<AllotmentHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const paneSizesRef = useRef<number[]>([]);

    const { widthClass, tokens } = useLayout();
    const isPhone = useMediaQuery('(max-width:699px)');
    const [phonePane, setPhonePane] = useState<'thread' | 'canvas'>('thread');
    const { width: splitWidth } = useContainerSize(containerRef);

    // The user's chosen column *count*, not a pixel width — so a window resize
    // preserves their intent instead of carrying a stale pixel value around.
    // Cleared when the width class changes, handing control back to the default.
    const [userColumns, setUserColumns] = useState<number | null>(null);
    // Read by the drag handler, which runs before `columnCap` is in scope.
    const columnCapRef = useRef(MAX_THREAD_COLUMNS);
    // Pane widths must come from the same tokens DataThread renders columns
    // with, or the snap points stop lining up with the rendered columns.
    const paneWidth = useCallback(
        (n: number) => threadPaneWidthFor(n, tokens),
        [tokens],
    );

    const nearestColumnCount = useCallback((width: number) => {
        let best = 1;
        let bestDist = Infinity;
        for (let n = 1; n <= columnCapRef.current; n++) {
            const dist = Math.abs(width - paneWidth(n));
            if (dist < bestDist) {
                bestDist = dist;
                best = n;
            }
        }
        return best;
    }, [paneWidth]);

    const snapToColumns = useCallback((sizes: number[]) => {
        if (sizes.length < 2) return;
        const columns = nearestColumnCount(sizes[0]);
        const target = paneWidth(columns);
        setUserColumns(columns);

        // A same-column drag does not change React state, so the pinning effect
        // below will not rerun. Snap the panes explicitly after Allotment has
        // finished its own drag bookkeeping.
        requestAnimationFrame(() => {
            try {
                allotmentRef.current?.resize([target, splitWidth - target]);
            } catch {
                // The pane structure may have changed while the drag ended.
            }
        });
    }, [nearestColumnCount, paneWidth, splitWidth]);

    // The thread pane only ever rests on a whole-column width. Dragging the
    // window edge changes how many columns *fit*; it never leaves the pane at
    // an arbitrary size, so the canvas absorbs the whole delta.

    // How many columns the thread could actually fill: one per leaf chain, plus
    // a slot for the source shelf. Chain-splitting can add more, so treat this
    // as a floor — it exists only to stop a wide screen reserving empty columns.
    const threadColumnDemand = useMemo(() => {
        const hasChild = new Set<string>();
        derivedTables.forEach(t => { if (t.derive) hasChild.add(t.derive.trigger.tableId); });
        const leaves = derivedTables.filter(t => !hasChild.has(t.id)).length;
        return Math.max(1, leaves + (hasInputTables ? 1 : 0));
    }, [derivedTables, hasInputTables]);

    const columnCap = maxThreadColumnsForWidth(
        splitWidth,
        tokens,
        maxThreadColumnsForWidthClass(widthClass),
    );
    columnCapRef.current = columnCap;
    const preferredColumns = Math.min(
        userColumns ?? defaultThreadColumns(widthClass, threadColumnDemand, splitWidth, tokens),
        columnCap,
    );

    // A new width class re-asserts the default; within a class the drag sticks.
    const prevWidthClassRef = useRef(widthClass);
    useEffect(() => {
        if (prevWidthClassRef.current === widthClass) return;
        prevWidthClassRef.current = widthClass;
        setUserColumns(null);
    }, [widthClass]);

    // Hold the thread pane at exactly `threadPaneWidth(preferredColumns)`.
    //
    // Runs on every split-container resize, not just on discrete events:
    //   - `preferredSize` only applies when a pane first mounts, and this pane
    //     unmounts whenever the session is empty;
    //   - Allotment otherwise redistributes a container resize across both
    //     panes, leaving the thread at an arbitrary width where the column
    //     count flips at unpredictable points.
    // Pinning it here means the canvas absorbs the entire delta and the thread
    // only ever changes in whole columns.
    // The canvas shows the focused item, and nothing else opens or closes it.
    // Resolved, not raw: a text turn with no chart or table behind it (an
    // explanation on a rootless thread) has nothing to draw, so stay closed.
    const canvasOpen = !!canvasTarget && !canvasClosing;

    useEffect(() => {
        if (!isPhone) return;
        setPhonePane(canvasTarget ? 'canvas' : 'thread');
    }, [isPhone, canvasTarget]);

    // Closing collapses the pane first and drops the focus only once it has
    // gone; clearing focus up front would swap the chart for the empty-canvas
    // gallery and slide *that* away.
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeCanvas = useCallback(() => {
        setPhonePane('thread');
        setCanvasClosing(true);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            setCanvasClosing(false);
            dispatch(dfActions.setFocused(undefined));
        }, CANVAS_TRANSITION_MS);
    }, [dispatch]);
    useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);
    useEffect(() => {
        // Something grabbed focus mid-close (a new table, say) — keep the canvas.
        if (!canvasTarget || !closeTimerRef.current) return;
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
        setCanvasClosing(false);
    }, [canvasTarget]);

    // Always armed except while dragging: arming it from an effect would land
    // after Allotment has already written the new widths, so nothing would ease.
    const [sashDragging, setSashDragging] = useState(false);

    useEffect(() => {
        // With the canvas hidden the thread owns the whole split, so there is
        // nothing to pin and resize([a, b]) would fight the visibility change.
        if (!canvasOpen) return;
        if (!allotmentRef.current || splitWidth <= 0) return;

        const target = paneWidth(preferredColumns);
        // Defer both the measurement and correction until Allotment has
        // processed the new container size. Checking before this frame can
        // see the old snapped width and skip just before Allotment moves it.
        const rafId = requestAnimationFrame(() => {
            try {
                if (splitWidth - target < tokens.canvas.min) return;
                if (Math.abs((paneSizesRef.current[0] ?? -1) - target) <= 1) return;
                allotmentRef.current?.resize([target, splitWidth - target]);
            } catch {
                // Allotment pane structure may not yet match; ignore.
            }
        });
        return () => cancelAnimationFrame(rafId);
    }, [canvasOpen, preferredColumns, splitWidth, tokens.canvas.min]);

    const threadPanel = (
        <DataThread centered={!canvasOpen} denseColumns={isPhone} sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            alignContent: 'flex-start',
            height: '100%',
        }} />
    );

    const canvasPanel = (
        <Box sx={{
            ...(isPhone ? {} : borderBoxStyle),
            height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxSizing: 'border-box', position: 'relative',
        }}>
            <Tooltip title={t('canvas.close', { defaultValue: 'Close canvas' })}>
                <IconButton
                    size="small"
                    onClick={closeCanvas}
                    sx={{
                        position: 'absolute', top: 8, right: 8, zIndex: 20,
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
                    }}
                >
                    <CloseIcon sx={{ fontSize: iconVar.md }} />
                </IconButton>
            </Tooltip>
            {viewMode === 'editor' ? visPane : <ReportView />}
        </Box>
    );

    const phoneWorkspace = (
        <Box sx={{ display: 'flex', height: '100%', minWidth: 0 }}>
            <DataSourceSidebar
                onOpenUploadDialog={(tab) => openUploadDialog((tab ?? 'menu') as UploadTabType)}
                connectorRefreshKey={connectorRefreshKey}
                onConnectorsChanged={handleConnectorsChanged}
                onStartDataLoadingChat={(text) => startDataLoadingChat(text)}
                bottomActions={sidebarBottomActions}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <Tabs
                    value={phonePane}
                    onChange={(_, value: 'thread' | 'canvas') => setPhonePane(value)}
                    variant="fullWidth"
                    sx={{
                        minHeight: 36,
                        bgcolor: 'background.paper',
                        borderTop: `1px solid ${borderColor.view}`,
                        borderBottom: `1px solid ${borderColor.view}`,
                        '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: textVar.sm, textTransform: 'none' },
                    }}
                >
                    <Tab value="thread" label={t('mobile.thread', { defaultValue: 'Thread' })} />
                    <Tab value="canvas" label={t('mobile.canvas', { defaultValue: 'Canvas' })} disabled={!canvasTarget} />
                </Tabs>
                <Box sx={{
                    flex: 1, minHeight: 0, overflow: 'hidden',
                    p: phonePane === 'thread' ? 0.5 : 0,
                }}>
                    {phonePane === 'canvas' && canvasTarget ? canvasPanel : threadPanel}
                </Box>
            </Box>
        </Box>
    );

    const fixedSplitPane = (
        <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
            <DataSourceSidebar
                onOpenUploadDialog={(tab) => openUploadDialog((tab ?? 'menu') as UploadTabType)}
                connectorRefreshKey={connectorRefreshKey}
                onConnectorsChanged={handleConnectorsChanged}
                onStartDataLoadingChat={(text) => startDataLoadingChat(text)}
                bottomActions={sidebarBottomActions}
            />
            <Box ref={containerRef} className="outer-allotment" sx={{
                margin: '4px 8px 8px 8px', backgroundColor: 'white',
                display: 'flex', height: 'calc(100% - 12px)', flex: 1, minWidth: 0, flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                // Allotment waits 300ms before adding its hover class.
                // Native hover responds immediately with the app's fast token.
                '& [class*="sash_"][class*="vertical"]::before': {
                    transition: `${transition.fast} !important`,
                },
                '& [class*="sash_"][class*="vertical"]:hover::before': {
                    background: 'var(--focus-border)',
                },
                // Allotment lays out with `left` + `width`, so both must ease
                // or the panes resize while their positions jump. Suspended
                // mid-drag, where easing would lag the cursor.
                ...(sashDragging ? {} : {
                    '& .split-view-view, & [class*="sash_"]': {
                        transition: `left ${CANVAS_TRANSITION_MS}ms ease, width ${CANVAS_TRANSITION_MS}ms ease`,
                    },
                }),
            }}>
                <Allotment
                    ref={allotmentRef}
                    onChange={(sizes) => { paneSizesRef.current = sizes; }}
                    onDragStart={() => setSashDragging(true)}
                    onDragEnd={(sizes) => { setSashDragging(false); snapToColumns(sizes); }}
                    proportionalLayout={false}
                >
                    <Allotment.Pane minSize={paneWidth(1)}
                        preferredSize={paneWidth(preferredColumns)}
                        // Uncapped with the canvas away, so the thread can take
                        // the whole surface. Must be an explicit Infinity:
                        // Allotment skips `undefined` and keeps the old cap.
                        maxSize={canvasOpen ? paneWidth(columnCap) : Number.POSITIVE_INFINITY} snap={false}>
                        {threadPanel}
                    </Allotment.Pane>
                    <Allotment.Pane minSize={tokens.canvas.min} visible={canvasOpen}>
                        {canvasPanel}
                    </Allotment.Pane>
                </Allotment>
            </Box>
        </Box>
    );

    let footer = <Box sx={{
        color: 'text.secondary', display: 'flex',
        backgroundColor: 'rgba(255, 255, 255, 0.89)',
        alignItems: 'center', justifyContent: 'center',
        py: 0.75,
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
    }}>
        <Button size="small" color="inherit"
            sx={{ textTransform: 'none', fontSize: textVar.sm }}
            target="_blank" rel="noopener noreferrer"
            href="https://techknomatic.com/privacy-policy/">Privacy & Cookies</Button>
        <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} />
        <Button size="small" color="inherit"
            sx={{ textTransform: 'none', fontSize: textVar.sm }}
            target="_blank" rel="noopener noreferrer"
            href="https://techknomatic.com/terms-and-conditions/">Terms of Use</Button>
        <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} />
        <Button size="small" color="inherit"
            sx={{ textTransform: 'none', fontSize: textVar.sm }}
            target="_blank" rel="noopener noreferrer"
            href="https://techknomatic.com/contact-us/">Contact Us</Button>
        <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} />
        <Typography sx={{ display: 'inline', fontSize: textVar.sm, color: 'text.secondary', fontWeight: 500, ml: 0.5 }}>
            © {new Date().getFullYear()} Techknomatic Services Pvt. Ltd.
        </Typography>
    </Box>;

    let dataUploadRequestBox = <Box sx={{
        margin: 0,
        backgroundColor: '#eef2fa',
        flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
    }}>
        {/* ── Full-page decorative background illustration ── */}
        <Box
            aria-hidden="true"
            sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${heroBg})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center right',
                backgroundSize: 'cover',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />

        {/* ── Content container ── */}
        <Box sx={{
            ml: { xs: 2, sm: 4, md: 6, lg: 8 },
            mr: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 2, sm: 2.5, md: 3.5 },
            pb: 8,
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1060,
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
        }}>
            {/* ── Hero Section (Logo, Title, Tagline) ── */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                mt: { xs: 1, md: 2 },
                mb: 2.5,
            }}>
                <Box
                    component="img"
                    src={theme.palette.mode === 'dark' ? techknomaticWhiteLogo : techknomaticLogo}
                    alt="Techknomatic"
                    sx={{
                        height: { xs: 44, sm: 52, md: 58 },
                        width: 'auto',
                        objectFit: 'contain',
                        mb: 2,
                        flexShrink: 0,
                    }}
                />
                <Typography sx={{
                    fontSize: { xs: 30, sm: 36, md: 40 },
                    fontWeight: 800,
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                    display: 'flex',
                    alignItems: 'baseline',
                    mb: 1,
                }}>
                    <Box component="span" sx={{ color: '#1a1a2e' }}>
                        Insight
                    </Box>
                    <Box component="span" sx={{ color: '#3B5EDB' }}>
                        Canvas
                    </Box>
                </Typography>
                <Typography sx={{
                    fontSize: { xs: 14, sm: 15, md: 16 },
                    color: '#5a6577',
                    lineHeight: 1.6,
                    fontWeight: 400,
                    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                    maxWidth: 440,
                }}>
                    AI-powered data exploration, visualization, and reporting.
                </Typography>
            </Box>

            {/* Hosted-demo notice (if connector disabled) */}
            {serverConfig.DISABLE_DATA_CONNECTORS && (
                <Box
                    sx={{
                        mb: 2,
                        mx: 'auto',
                        maxWidth: 760,
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 0.5,
                        py: 0.5,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: textVar.sm, lineHeight: 1.5, flex: 1 }}
                    >
                        {t('landing.demoBannerBody', {
                            defaultValue:
                                'This is a demo site! Try the examples below or upload files. To work with large datasets, connect to databases, link local folders, create persisted analysis sessions, use custom models, and manage users, check the ',
                        })}
                        <Link
                            href="https://github.com/microsoft/data-formulator"
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{
                                color: 'primary.main',
                                '&:hover': { color: 'primary.dark' },
                            }}
                        >
                            <GitHubIcon
                                sx={{
                                    fontSize: '1em',
                                    verticalAlign: '-0.15em',
                                    mr: 0.4,
                                }}
                            />
                            {t('landing.demoBannerCta', { defaultValue: 'installation guide' })}
                        </Link>
                        {t('landing.demoBannerSuffix', { defaultValue: '.' })}
                    </Typography>
                </Box>
            )}

            {/* AI Prompt & Data Load Section */}
            <Box sx={{ mt: 0, mb: 3.5, width: '100%', maxWidth: 720 }}>
                <DataLoadMenu
                    onSelectTab={(tab) => openUploadDialog(tab)}
                    onSelectConnector={(conn) => {
                        if (conn.connected || conn.sso_auto_connect) {
                            dispatch(dfActions.focusConnector(conn.id));
                        } else {
                            openUploadDialog(`connector:${conn.id}` as UploadTabType);
                        }
                    }}
                    onStartChat={(prompt, images, attachments) => startAnalystChat(prompt, images, attachments)}
                    hasPriorConversation={dataLoadingChatMessages.length > 0}
                    onResumeChat={() => openUploadDialog('extract')}
                    serverConfig={serverConfig}
                    connectors={pageConnectors}
                />
            </Box>

            {/* Demos Section matching reference image */}
            <Box sx={{ mt: 0.5, width: '100%' }}>
                <Typography sx={{ color: '#1a1a2e', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', mb: 1.5, fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif" }}>
                    {t('landing.demos', { defaultValue: 'DEMOS' })}
                </Typography>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%',
                }}>
                    <Box sx={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: 1.5,
                        width: '100%',
                    }}>
                        {demoSessions.slice(0, 4).map((session) => (
                            <ExampleSessionCard
                                key={session.id}
                                session={session}
                                onClick={() => handleLoadExampleSession(session)}
                            />
                        ))}
                    </Box>
                    {demoSessions.length > 4 && (
                        <IconButton
                            size="small"
                            onClick={() => openUploadDialog('menu')}
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                bgcolor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                color: '#1e293b',
                                flexShrink: 0,
                                '&:hover': {
                                    bgcolor: '#f1f5f9',
                                    borderColor: '#cbd5e1',
                                },
                            }}
                        >
                            <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Bottom Right Floating Info Icon */}
            <Box sx={{ position: 'fixed', bottom: 18, right: 20, zIndex: 90 }}>
                <IconButton
                    size="small"
                    onClick={() => window.open('https://github.com/microsoft/data-formulator', '_blank')}
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid #e2e8f0',
                        color: '#94a3b8',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                        '&:hover': {
                            color: '#1B75BB',
                            bgcolor: '#ffffff',
                            borderColor: '#93c5fd',
                        },
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>

            {/* ── Saved workspaces section ──────────────────────────── */}
            <Box sx={{ mt: 4.5, width: '100%' }}>
                {/* Section header — left-aligned label with the sort control on the right */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{
                        color: '#1a1a2e',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                    }}>
                        {t('workspace.yourSessions', { defaultValue: 'YOUR SESSIONS' })}
                    </Typography>
                    <Select
                        size="small"
                        variant="standard"
                        value={wsSort}
                        onChange={(e) => setWsSort(e.target.value as typeof wsSort)}
                        disableUnderline
                        inputProps={{ 'aria-label': t('workspace.sortSessions') }}
                        IconComponent={(props) => (
                            <ExpandMoreIcon {...props} sx={{ fontSize: '18px', color: '#64748b', right: 0 }} />
                        )}
                        sx={{
                            fontSize: '12.5px',
                            fontWeight: 500,
                            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                            color: '#64748b',
                            cursor: 'pointer',
                            '& .MuiSelect-select': { py: 0.25, pl: 0, pr: '18px !important', minHeight: 0 },
                            '&:hover': { color: '#1e293b' },
                            '&:hover .MuiSelect-icon': { color: '#1e293b' },
                        }}
                        renderValue={(v) => {
                            const labels: Record<typeof wsSort, string> = {
                                created_desc: t('workspace.sortNewest'),
                                created_asc: t('workspace.sortOldest'),
                                updated_desc: t('workspace.sortRecentlyModified'),
                                name_asc: t('workspace.sortName'),
                            };
                            return labels[v as typeof wsSort];
                        }}
                    >
                        <MenuItem value="created_desc" sx={{ fontSize: '13px', fontFamily: "'Inter', 'Roboto', sans-serif" }}>{t('workspace.sortNewestFirst')}</MenuItem>
                        <MenuItem value="created_asc" sx={{ fontSize: '13px', fontFamily: "'Inter', 'Roboto', sans-serif" }}>{t('workspace.sortOldestFirst')}</MenuItem>
                        <MenuItem value="updated_desc" sx={{ fontSize: '13px', fontFamily: "'Inter', 'Roboto', sans-serif" }}>{t('workspace.sortRecentlyModifiedFirst')}</MenuItem>
                        <MenuItem value="name_asc" sx={{ fontSize: '13px', fontFamily: "'Inter', 'Roboto', sans-serif" }}>{t('workspace.sortNameAsc')}</MenuItem>
                    </Select>
                </Box>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    width: '100%',
                }}>
                    {sortedSavedWorkspaces.map(w => {
                        const isRenaming = renamingWs === w.id;
                        return (
                            <Card
                                key={w.id}
                                variant="outlined"
                                onClick={isRenaming ? undefined : () => handleOpenWorkspace(w.id, w.display_name)}
                                sx={{
                                    position: 'relative',
                                    textAlign: 'left',
                                    cursor: isRenaming ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: '14px',
                                    bgcolor: '#ffffff',
                                    borderColor: '#eef2f6',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    minHeight: 76,
                                    boxSizing: 'border-box',
                                    '&:hover': isRenaming ? {} : {
                                        transform: 'translateY(-2px)',
                                        borderColor: '#93c5fd',
                                        boxShadow: '0 8px 20px rgba(27, 117, 187, 0.08)',
                                        '& .ws-actions': { opacity: 1 },
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 58,
                                        height: 48,
                                        flexShrink: 0,
                                        borderRadius: '8px',
                                        border: '1px solid #f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#fafcff',
                                        color: '#1B75BB',
                                    }}
                                >
                                    <TableChartOutlinedIcon sx={{ fontSize: 24 }} />
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0, pr: isRenaming ? 0 : 2.5 }}>
                                    {isRenaming ? (
                                        <TextField
                                            autoFocus
                                            fullWidth
                                            variant="standard"
                                            value={renameDraft}
                                            onChange={(e) => setRenameDraft(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onBlur={commitRenameWorkspace}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitRenameWorkspace();
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    cancelRenameWorkspace();
                                                }
                                            }}
                                            slotProps={{
                                                input: {
                                                    sx: {
                                                        fontSize: '13.5px',
                                                        fontWeight: 700,
                                                        fontFamily: "'Inter', 'Roboto', sans-serif",
                                                    },
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Typography
                                            sx={{
                                                fontSize: '13.5px',
                                                fontWeight: 700,
                                                color: '#0f172a',
                                                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                                                lineHeight: 1.2,
                                                mb: 0.3,
                                            }}
                                            noWrap
                                        >
                                            {w.display_name}
                                        </Typography>
                                    )}
                                    {w.saved_at && (
                                        <Typography
                                            sx={{
                                                fontSize: '11.5px',
                                                color: '#64748b',
                                                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                                                lineHeight: 1.35,
                                            }}
                                            noWrap
                                        >
                                            {new Date(w.saved_at).toLocaleString()}
                                        </Typography>
                                    )}
                                </Box>

                                <Box className="ws-actions" sx={{
                                    position: 'absolute', top: 6, right: 6,
                                    display: isRenaming ? 'none' : 'flex',
                                    gap: 0.25,
                                    opacity: 0,
                                    transition: 'opacity 0.15s ease',
                                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '6px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    p: 0.25,
                                }}>
                                    <Tooltip title={t('workspace.rename')}>
                                        <IconButton size="small" sx={{ width: 22, height: 22, color: '#64748b', '&:hover': { color: '#1B75BB', bgcolor: '#f0f7ff' } }}
                                            onClick={(e) => { e.stopPropagation(); startRenameWorkspace(w.id, w.display_name); }}>
                                            <EditOutlinedIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('workspace.export')}>
                                        <IconButton size="small" sx={{ width: 22, height: 22, color: '#64748b', '&:hover': { color: '#1B75BB', bgcolor: '#f0f7ff' } }}
                                            onClick={(e) => { e.stopPropagation(); handleExportWorkspace(w.id); }}>
                                            <DownloadIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('workspace.delete')}>
                                        <IconButton size="small" sx={{ width: 22, height: 22, color: '#64748b', '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' } }}
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteWs(w.id); }}>
                                            <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Card>
                        );
                    })}

                    {/* Import workspace card */}
                    <Card
                        variant="outlined"
                        onClick={() => importRef.current?.click()}
                        sx={{
                            textAlign: 'left',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            minHeight: 76,
                            bgcolor: 'rgba(255, 255, 255, 0.65)',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxSizing: 'border-box',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                borderColor: '#1B75BB',
                                bgcolor: '#ffffff',
                                boxShadow: '0 8px 20px rgba(27, 117, 187, 0.08)',
                                '& .import-icon-box': {
                                    bgcolor: '#e0f2fe',
                                    color: '#1B75BB',
                                    borderColor: '#93c5fd',
                                },
                            },
                        }}
                    >
                        <Box
                            className="import-icon-box"
                            sx={{
                                width: 58,
                                height: 48,
                                flexShrink: 0,
                                borderRadius: '8px',
                                border: '1px dashed #94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: '#f8fafc',
                                color: '#64748b',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <UploadFileIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                sx={{
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    color: '#334155',
                                    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                                    lineHeight: 1.2,
                                    mb: 0.3,
                                }}
                                noWrap
                            >
                                {t('workspace.importZip', { defaultValue: 'Import workspace (.zip)' })}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '11.5px',
                                    color: '#94a3b8',
                                    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                                    lineHeight: 1.35,
                                }}
                                noWrap
                            >
                                {t('workspace.importZipDesc', { defaultValue: 'Upload saved session' })}
                            </Typography>
                        </Box>
                        <input type="file" hidden accept=".zip" ref={importRef} onChange={handleImportWorkspace} />
                    </Card>
                </Box>
            </Box>
            {/* ── Delete workspace confirmation ────────────────────── */}
            <Dialog open={confirmDeleteWs !== null} onClose={() => setConfirmDeleteWs(null)}>
                <DialogTitle>{t('workspace.deleteTitle')}</DialogTitle>
                <DialogContent>
                    <Typography dangerouslySetInnerHTML={{
                        __html: t('workspace.deleteConfirm', {
                            name: savedWorkspaces.find(w => w.id === confirmDeleteWs)?.display_name || confirmDeleteWs,
                            id: confirmDeleteWs,
                            interpolation: { escapeValue: false },
                        }),
                    }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteWs(null)}>{t('workspace.cancel')}</Button>
                    <Button color="error" onClick={() => confirmDeleteWs && handleDeleteWorkspace(confirmDeleteWs)}>
                        {t('workspace.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
        {footer}
    </Box>;

    return (
        <Box sx={{ display: 'block', width: "100%", height: '100%', position: 'relative' }}>
            {activeWorkspace?.readOnly && (
                <Alert severity="warning" sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, maxWidth: 720 }}>
                    {t('workspace.expiredReadOnly', 'This temporary session has expired on the server. You are viewing a read-only browser snapshot.')}
                </Alert>
            )}
            <DndProvider backend={HTML5Backend}>
                {activeWorkspace && !provisionalSession ? (isPhone ? phoneWorkspace : fixedSplitPane) : (
                    <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                        <DataSourceSidebar
                            onOpenUploadDialog={(tab) => openUploadDialog((tab ?? 'menu') as UploadTabType)}
                            connectorRefreshKey={connectorRefreshKey}
                            onConnectorsChanged={handleConnectorsChanged}
                            onStartDataLoadingChat={(text) => startDataLoadingChat(text)}
                            bottomActions={sidebarBottomActions}
                        />
                        {dataUploadRequestBox}
                    </Box>
                )}
                <UnifiedDataUploadDialog
                    open={uploadDialogOpen}
                    onClose={() => {
                        setUploadDialogOpen(false);
                        // Nothing was added, so the workspace minted to open the
                        // dialog is discarded rather than left as a stub session.
                        // Read live state: a table loaded immediately before close
                        // lands in the same batch, leaving the rendered flag stale
                        // and orphaning the data under a discarded workspace.
                        if (dfSelectors.selectSessionEmpty(store.getState())) {
                            dispatch(dfActions.setActiveWorkspace(null));
                        }
                        refreshPageConnectors();
                    }}
                    initialTab={uploadDialogInitialTab}
                    onConnectorsChanged={handleConnectorsChanged}
                />
                {/* Loading overlay for session loading */}
                <Backdrop
                    open={sessionLoading}
                    sx={{
                        position: 'absolute',
                        zIndex: 999,
                        backgroundColor: alpha(theme.palette.background.default, 0.85),
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <AnvilLoader
                        height="100%"
                        label={sessionLoadingLabel || t('session.loadingSessions')}
                        action={(
                            <Button
                                variant="text"
                                size="small"
                                onClick={() => dispatch(dfActions.setSessionLoading({ loading: false }))}
                                sx={{ minWidth: 0, px: 0.5, textTransform: 'none', color: 'text.secondary' }}
                            >
                                {t('app.cancel')}
                            </Button>
                        )}
                        sx={{ width: '100%' }}
                    />
                </Backdrop>
                {selectedModelId == undefined && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: alpha(theme.palette.background.default, 0.85),
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000,
                    }}>
                        <Box sx={{ margin: 'auto', pb: '5%', display: "flex", flexDirection: "column", textAlign: "center", alignItems: "center" }}>
                            <Box
                                component="img"
                                sx={{
                                    height: { xs: 64, sm: 90 },
                                    maxWidth: 380,
                                    width: 'auto',
                                    margin: "auto",
                                    mb: 2.5,
                                    objectFit: 'contain'
                                }}
                                alt="InsightCanvas"
                                src={theme.palette.mode === 'dark' ? techknomaticWhiteLogo : techknomaticLogo}
                                fetchPriority="high"
                            />
                            <Typography variant="h3" sx={{ fontSize: { xs: 28, sm: 40 }, fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
                                Welcome to <Box component="span" sx={{ color: '#2b50ec' }}>InsightCanvas</Box>
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1.5, color: 'text.secondary', fontWeight: 500, fontSize: { xs: 15, sm: 17 } }}>
                                Turn your data into actionable business insights with AI.
                            </Typography>
                            <Typography variant="h4" sx={{ mt: 3, fontSize: 24, letterSpacing: '0.02em' }}>
                                {t('landing.firstSelectModelPrefix')} <ModelSelectionButton appearance="inline" />
                            </Typography>
                            <Typography color="text.secondary" variant="body1" sx={{ mt: 2, width: 600 }}>{t('landing.modelTip')}</Typography>
                        </Box>
                        {footer}
                    </Box>
                )}
            </DndProvider>
        </Box>);
}
