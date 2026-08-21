// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * KnowledgePanel — panel for browsing and editing knowledge items.
 *
 * Shows two collapsible sections: Rules (flat) and Workflows (flat).
 * Items are tagged for organization; no subdirectory grouping.
 * Supports search, edit, and delete. Rules can be created directly by
 * the user via the "+" affordance; workflows are produced by the
 * agent's distillation flow (see SessionDistill).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Divider,
    InputBase,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

import { useKnowledgeStore } from '../app/useKnowledgeStore';
import { MarkdownEditor } from '../components/MarkdownEditor';
import {
    deleteKnowledge,
    readDataMemory,
    rewriteDataMemory,
    type KnowledgeCategory,
} from '../api/knowledgeApi';
import type { KnowledgeItem } from '../api/knowledgeApi';
import { borderColor, radius } from '../app/tokens';
import { dfActions, dfSelectors, type DataFormulatorState } from '../app/dfSlice';
import { isLeafDerivedTable, buildLeafEvents } from './workflowContext';
import { SessionDistillDialog, findSessionWorkflow } from './SessionDistill';
import { iconVar, textVar } from '../app/layout';

// Default file name and seed body for a brand-new rule. Rules are plain
// Markdown — the user just edits the body; no front matter is required.
const DEFAULT_RULE_FILENAME = 'agent.md';
const RULE_TEMPLATE = `# Agent rules

Describe the constraints or conventions the agent should follow.
`;

type EditorKind = KnowledgeCategory | 'memory';

// ── Persistent action row (always visible at the top of each section) ────

interface ActionRowProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({ icon, label, onClick }) => (
    <Box
        onClick={onClick}
        role="button"
        tabIndex={0}
        sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            mx: 2, my: 0.75,
            px: 1.25, py: 0.75,
            cursor: 'pointer',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            bgcolor: '#f8fafc',
            transition: 'all 0.15s ease',
            '&:hover': {
                bgcolor: '#f1f5f9',
                borderColor: '#cbd5e1',
                color: '#2563eb',
            },
            '&:focus-visible': {
                outline: '2px solid #2563eb',
                outlineOffset: 2,
            },
            userSelect: 'none',
        }}
    >
        <Box sx={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography sx={{
            fontSize: '13px', fontWeight: 500, color: 'inherit', wordBreak: 'break-word',
            fontFamily: "'Inter', 'Roboto', sans-serif",
        }}>
            {label}
        </Typography>
    </Box>
);

// ── Main Component ───────────────────────────────────────────────────────

export const KnowledgePanel: React.FC = () => {
    const { t } = useTranslation();
    const store = useKnowledgeStore();
    const dispatch = useDispatch();

    // For the "distill from this session" placeholder under WORKFLOWS.
    const tables = useSelector(dfSelectors.getAllTables);
    // Workflow replay needs data to run on — disable replay when the
    // workspace has no tables loaded.
    const hasTables = tables.length > 0;
    const charts = useSelector((s: DataFormulatorState) => s.charts);
    const conceptShelfItems = useSelector((s: DataFormulatorState) => s.conceptShelfItems);
    const selectedModelId = useSelector((s: DataFormulatorState) => s.selectedModelId);
    const allModels = useSelector((s: DataFormulatorState) => [...s.globalModels, ...s.models]);

    const [searchQuery, setSearchQuery] = useState('');

    // Editor dialog state — used both for editing existing entries and
    // for creating new rules (in which case editorOriginalPath is empty).
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorCategory, setEditorCategory] = useState<EditorKind>('rules');
    const [editorPath, setEditorPath] = useState('');
    const [editorContent, setEditorContent] = useState('');
    const [editorOriginalPath, setEditorOriginalPath] = useState('');
    const [editorSaving, setEditorSaving] = useState(false);
    const [editorLoading, setEditorLoading] = useState(false);
    const [memoryUnlocked, setMemoryUnlocked] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<{ category: KnowledgeCategory; path: string; title: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch all on mount
    useEffect(() => {
        store.fetchAll();
    }, []);

    // ── Search ───────────────────────────────────────────────────────────

    const handleSearch = useCallback(() => {
        const q = searchQuery.trim();
        if (q) {
            store.search(q);
        } else {
            store.clearSearch();
        }
    }, [searchQuery, store]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        store.clearSearch();
    }, [store]);

    // ── Editor ──────────────────────────────────────────────────────────

    const openCreateDialog = useCallback((category: KnowledgeCategory) => {
        setEditorCategory(category);
        setEditorPath(category === 'rules' ? DEFAULT_RULE_FILENAME : '');
        setEditorOriginalPath('');
        setEditorContent(category === 'rules' ? RULE_TEMPLATE : '');
        setEditorLoading(false);
        setEditorOpen(true);
    }, []);

    const openEditDialog = useCallback(async (category: KnowledgeCategory, item: KnowledgeItem) => {
        setEditorCategory(category);
        setEditorPath(item.path);
        setEditorOriginalPath(item.path);
        setEditorContent('');
        setEditorOpen(true);
        setEditorLoading(true);

        const content = await store.read(category, item.path);
        if (content !== null) {
            setEditorContent(content);
        }
        setEditorLoading(false);
    }, [store]);

    const openMemoryDialog = useCallback(async () => {
        setEditorCategory('memory');
        setMemoryUnlocked(false);
        setEditorPath('data-memory.md');
        setEditorOriginalPath('data-memory.md');
        setEditorContent('');
        setEditorOpen(true);
        setEditorLoading(true);
        try {
            setEditorContent(await readDataMemory());
        } catch {
            dispatch(dfActions.addMessages({
                timestamp: Date.now(),
                type: 'error',
                component: 'knowledge',
                value: t('knowledge.failedToLoad'),
            }));
        } finally {
            setEditorLoading(false);
        }
    }, [dispatch, t]);

    const handleSave = useCallback(async () => {
        if (editorCategory !== 'memory' && (!editorPath.trim() || !editorContent.trim())) return;
        setEditorSaving(true);

        if (editorCategory === 'memory') {
            try {
                await rewriteDataMemory(editorContent);
                dispatch(dfActions.addMessages({
                    timestamp: Date.now(),
                    type: 'success',
                    component: 'knowledge',
                    value: t('knowledge.saved'),
                }));
                setEditorOpen(false);
            } catch {
                dispatch(dfActions.addMessages({
                    timestamp: Date.now(),
                    type: 'error',
                    component: 'knowledge',
                    value: t('knowledge.failedToSave'),
                }));
            } finally {
                setEditorSaving(false);
            }
            return;
        }

        const fileName = editorPath.endsWith('.md') ? editorPath : `${editorPath}.md`;
        const path = fileName;
        const success = await store.save(editorCategory, path, editorContent);
        if (success && editorOriginalPath && path !== editorOriginalPath) {
            try { await deleteKnowledge(editorCategory, editorOriginalPath); } catch { /* best-effort */ }
        }
        setEditorSaving(false);
        if (success) {
            setEditorOpen(false);
        }
    }, [editorPath, editorOriginalPath, editorContent, editorCategory, store, dispatch, t]);

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        await store.remove(deleteTarget.category, deleteTarget.path);
        setDeleting(false);
        setDeleteTarget(null);
    }, [deleteTarget, store]);

    // ── Distill from current session ────────────────────────────────────
    // The WORKFLOWS placeholder is bound to the
    // active workspace. When the workspace already has a distilled
    // workflow (matched by `sourceWorkspaceId` in front matter) we
    // expose an inline ⟳ Update affordance on the existing entry;
    // otherwise the placeholder opens the dialog in *create* mode.
    // See design-docs/24-session-scoped-distillation.md.

    const activeWorkspace = useSelector((s: DataFormulatorState) => s.activeWorkspace);
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const [sessionUpdateMode, setSessionUpdateMode] = useState(false);
    // True while the SessionDistillDialog is running its LLM call.
    // The dialog can be closed independently; this flag lives on the panel
    // so the action row keeps a busy indicator until the request finishes.
    const [sessionDistilling, setSessionDistilling] = useState(false);

    // True when at least one leaf in the session has a distillable chain
    // (i.e. has a user message). Cheap to compute — same predicate as
    // before, just used for the placeholder enable-state.
    const hasDistillableSession = React.useMemo(() => {
        return tables.some(t =>
            isLeafDerivedTable(t, tables) &&
            buildLeafEvents(t, tables, charts, conceptShelfItems) != null,
        );
    }, [tables, charts, conceptShelfItems]);

    const selectedModel = allModels.find(m => m.id === selectedModelId);
    const canDistillFromSession = hasDistillableSession && !!selectedModel && !!activeWorkspace;

    const sessionWorkflow = React.useMemo(
        () => findSessionWorkflow(
            store.stateMap['workflows'].items,
            activeWorkspace?.id,
        ),
        [store.stateMap, activeWorkspace?.id],
    );

    const openSessionDistillDialog = useCallback((updateMode: boolean) => {
        setSessionUpdateMode(updateMode);
        setSessionDialogOpen(true);
    }, []);

    // ── Replay a workflow ────────────────────────────────────────────
    // Reads the workflow body and asks the data agent (in SimpleChartRecBox)
    // to reproduce the captured workflow on the currently loaded data. v1 is
    // deliberately simple: we hand the whole workflow to the agent in one
    // request via a window event and let it figure out the rest.
    // See discussion/replayable-experience-workflow.md.
    const handleReplay = useCallback(async (item: KnowledgeItem) => {
        const content = await store.read('workflows', item.path);
        if (content == null) return;
        const prompt = t('knowledge.replayPrompt', { content });
        window.dispatchEvent(new CustomEvent('df-replay-workflow', {
            detail: { prompt, title: item.title },
        }));
    }, [store, t]);

    // ── Render section ──────────────────────────────────────────────────

    const renderItem = useCallback((
        category: KnowledgeCategory,
        item: KnowledgeItem,
    ) => {
        const displayTitle = (item.title || '').replace(/^\s*(?:Workflow|Experience) from .+?:\s*/i, '').trim();
        const primary = displayTitle || item.title || item.path;
        return (
            <Box
                key={`${category}/${item.path}`}
                onClick={() => openEditDialog(category, item)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    mx: 1.5, px: 1, py: 0.75,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#0f172a',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: '#f8fafc' },
                    '&:hover .item-actions': { display: 'inline-flex' },
                    userSelect: 'none',
                }}
            >
                <DescriptionOutlinedIcon sx={{ fontSize: 16, color: '#64748b', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', color: '#0f172a', fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        {primary}
                    </Typography>
                </Box>
                {item.source === 'agent_summarized' && (
                    <Tooltip title={t('knowledge.sourceAgent')}>
                        <SmartToyOutlinedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                    </Tooltip>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    {category === 'workflows' && (
                        <Tooltip title={hasTables ? t('knowledge.replayTooltip') : t('knowledge.replayNoData')}>
                            <span>
                                <IconButton
                                    size="small"
                                    aria-label={hasTables ? t('knowledge.replayTooltip') : t('knowledge.replayNoData')}
                                    disabled={!hasTables}
                                    onClick={(e) => { e.stopPropagation(); handleReplay(item); }}
                                    sx={{
                                        p: 0.5,
                                        borderRadius: '6px',
                                        color: '#2563eb',
                                        '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' },
                                    }}
                                >
                                    <PlayArrowIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                    <IconButton
                        className="item-actions"
                        size="small"
                        aria-label={t('knowledge.deleteItem')}
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ category, path: item.path, title: item.title }); }}
                        sx={{ p: 0.5, borderRadius: '6px', display: 'none', color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>
            </Box>
        );
    }, [openEditDialog, t, handleReplay, hasTables]);

    const renderCategorySection = useCallback((
        category: KnowledgeCategory,
        label: string,
        hint: string,
    ) => {
        const state = store.stateMap[category];

        // Persistent action row at the top of the section. Rules: opens
        // the create dialog. Workflows: opens the session distill
        // dialog in create or update mode depending on whether the active
        // workspace already has a distilled workflow.
        // See design-docs/24-session-scoped-distillation.md.
        const renderActionRow = () => {
            if (category === 'rules') {
                return (
                    <ActionRow
                        icon={<AddIcon sx={{ fontSize: 16 }} />}
                        label={t('knowledge.addNewRule', { defaultValue: 'Add new rule' })}
                        onClick={() => openCreateDialog('rules')}
                    />
                );
            }
            // workflows
            if (!canDistillFromSession) {
                // No active workspace, no model, or no distillable thread
                // yet — show a passive hint instead of a dead action.
                if (state.items.length > 0) return null;
                return (
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8', px: 2, py: 0.75, fontStyle: 'italic', fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        {t('knowledge.noItems')}
                    </Typography>
                );
            }
            const updateMode = !!sessionWorkflow;
            if (sessionDistilling) {
                return (
                    <ActionRow
                        icon={<CircularProgress size={14} />}
                        label={t('knowledge.distilling', { defaultValue: 'Distilling workflow…' })}
                        onClick={() => openSessionDistillDialog(updateMode)}
                    />
                );
            }
            return (
                <ActionRow
                    icon={updateMode
                        ? <RefreshIcon sx={{ fontSize: 16 }} />
                        : <AddIcon sx={{ fontSize: 16 }} />}
                    label={updateMode
                        ? t('knowledge.updateFromSession', { defaultValue: 'Update from this session' })
                        : t('knowledge.distillFromSession', { defaultValue: 'Distill from this session' })}
                    onClick={() => openSessionDistillDialog(updateMode)}
                />
            );
        };

        return (
            <Box key={category} sx={{ pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                <Box
                    sx={{
                        display: 'flex', alignItems: 'center',
                        px: 2, pt: 1.5, pb: 0.5,
                        userSelect: 'none',
                    }}
                >
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        {label}
                    </Typography>
                </Box>

                {/* Always-visible guidance for the section. */}
                <Box sx={{ px: 2, mb: 0.75 }}>
                    <Typography sx={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        {hint}
                    </Typography>
                </Box>

                {state.loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                        <CircularProgress size={16} />
                    </Box>
                )}
                {!state.loading && renderActionRow()}
                {state.items.map(item => renderItem(category, item))}
            </Box>
        );
    }, [store.stateMap, renderItem, openCreateDialog, t, canDistillFromSession, sessionWorkflow, sessionDistilling, openSessionDistillDialog]);

    // ── Main render ─────────────────────────────────────────────────────

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#ffffff' }}>
            {/* Search bar matching Sessions and Data Connectors */}
            <Box sx={{ px: 2, pb: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        px: 1.25,
                        py: 0.6,
                        gap: 1,
                        transition: 'all 0.15s ease',
                        '&:focus-within': {
                            bgcolor: '#ffffff',
                            borderColor: '#2563eb',
                            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
                        },
                    }}
                >
                    <SearchIcon sx={{ fontSize: 16, color: '#94a3b8', flexShrink: 0 }} />
                    <InputBase
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            const q = e.target.value.trim();
                            if (q) store.search(q);
                            else store.clearSearch();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearch();
                            }
                        }}
                        placeholder={t('knowledge.searchKnowledge', { defaultValue: 'Search knowledge…' })}
                        sx={{
                            fontSize: '13px',
                            color: '#0f172a',
                            flex: 1,
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                            '& input': { p: 0, '&::placeholder': { color: '#94a3b8', opacity: 1 } },
                        }}
                    />
                    {searchQuery && (
                        <IconButton size="small" onClick={clearSearch} sx={{ p: 0.25, color: '#94a3b8', '&:hover': { color: '#0f172a' } }}>
                            <ClearIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Content area */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain' }}>
                <Box>
                    {renderCategorySection('rules', t('knowledge.rules'), t('knowledge.rulesHint'))}
                    {renderCategorySection('workflows', t('knowledge.workflows'), t('knowledge.workflowsHint'))}
                    <Box sx={{ pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1.5, pb: 0.5, userSelect: 'none' }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                {t('knowledge.dataMemory', { defaultValue: 'Data Memory' })}
                            </Typography>
                        </Box>
                        <Box sx={{ px: 2, mb: 0.75 }}>
                            <Typography sx={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                {t('knowledge.dataMemoryHint', { defaultValue: 'User-wide notes about known data sources and relationships. This memory may be stale; agents verify live metadata before using it.' })}
                            </Typography>
                        </Box>
                        <ActionRow
                            icon={<DescriptionOutlinedIcon sx={{ fontSize: 16 }} />}
                            label={t('knowledge.editDataMemory', { defaultValue: 'data-memory.md' })}
                            onClick={openMemoryDialog}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Session distill dialog */}
            <SessionDistillDialog
                open={sessionDialogOpen}
                updateMode={sessionUpdateMode}
                onClose={() => setSessionDialogOpen(false)}
                onRunningChange={setSessionDistilling}
            />

            {/* Editor dialog */}
            <Dialog
                open={editorOpen}
                onClose={() => { if (!editorSaving) setEditorOpen(false); }}
                maxWidth="lg"
                fullWidth
                sx={{ '& .MuiDialog-paper': { height: '90vh', maxHeight: 900 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: textVar.xl, pb: 0.5 }}>
                    <Box sx={{ flex: 1 }}>
                        {editorCategory === 'memory'
                            ? t('knowledge.dataMemory', { defaultValue: 'Data Memory' })
                            : t('knowledge.editTitle')}
                    </Box>
                    {editorCategory === 'memory' && (
                        <Tooltip title={memoryUnlocked
                            ? t('knowledge.lockDataMemory', { defaultValue: 'Lock editing' })
                            : t('knowledge.unlockDataMemory', { defaultValue: 'Unlock editing' })}
                        >
                            <IconButton
                                size="small"
                                aria-label={memoryUnlocked
                                    ? t('knowledge.lockDataMemory', { defaultValue: 'Lock editing' })
                                    : t('knowledge.unlockDataMemory', { defaultValue: 'Unlock editing' })}
                                onClick={() => setMemoryUnlocked(unlocked => !unlocked)}
                                color={memoryUnlocked ? 'primary' : 'default'}
                            >
                                {memoryUnlocked
                                    ? <LockOpenOutlinedIcon sx={{ fontSize: iconVar.lg }} />
                                    : <LockOutlinedIcon sx={{ fontSize: iconVar.lg }} />}
                            </IconButton>
                        </Tooltip>
                    )}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0, pt: '8px !important' }}>
                    {editorCategory === 'memory' ? (
                        <Typography sx={{ fontSize: textVar.sm, color: 'text.secondary' }}>
                            data-memory.md
                        </Typography>
                    ) : <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            label={t('knowledge.fileName')}
                            placeholder={t('knowledge.fileNamePlaceholder')}
                            value={editorPath}
                            onChange={(e) => setEditorPath(e.target.value)}
                            sx={{ flex: 1, minWidth: 150, '& .MuiInputBase-input': { fontSize: textVar.sm } }}
                            slotProps={{ inputLabel: { sx: { fontSize: textVar.sm } } }}
                        />
                    </Box>}

                    {editorLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <Box sx={{
                            border: `1px solid ${borderColor.component}`,
                            borderRadius: radius.sm,
                            overflow: 'hidden',
                            flex: 1,
                            minHeight: 300,
                        }}>
                            <MarkdownEditor
                                value={editorContent}
                                onChange={setEditorContent}
                                placeholder="# Title\n\nWrite your knowledge content in Markdown..."
                                readOnly={editorCategory === 'memory' && !memoryUnlocked}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {editorCategory !== 'memory' && (
                        <Button
                            onClick={() => { setEditorOpen(false); setDeleteTarget({ category: editorCategory, path: editorOriginalPath, title: editorOriginalPath }); }}
                            color="error"
                            sx={{ textTransform: 'none', fontSize: textVar.sm, mr: 'auto' }}
                        >
                            {t('app.delete')}
                        </Button>
                    )}
                    {editorCategory === 'memory' && <Box sx={{ mr: 'auto' }} />}
                    <Button
                        onClick={() => setEditorOpen(false)}
                        disabled={editorSaving}
                        sx={{ textTransform: 'none', fontSize: textVar.sm }}
                    >
                        {t('app.cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={
                            editorSaving
                            || (editorCategory === 'memory' && !memoryUnlocked)
                            || (editorCategory !== 'memory' && !editorContent.trim())
                            || (editorCategory !== 'memory' && !editorPath.trim())
                        }
                        variant="contained"
                        sx={{ textTransform: 'none', fontSize: textVar.sm }}
                    >
                        {editorSaving ? t('knowledge.saving') : t('knowledge.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deleteTarget} onClose={() => { if (!deleting) setDeleteTarget(null); }}>
                <DialogTitle sx={{ fontSize: textVar.xl, pb: 0.5 }}>
                    {deleteTarget ? t('knowledge.deleteConfirm', { title: deleteTarget.title }) : ''}
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: textVar.md }}>
                        {t('knowledge.deleteConfirmBody')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: 'none', fontSize: textVar.sm }}>
                        {t('app.cancel')}
                    </Button>
                    <Button onClick={handleDelete} disabled={deleting} color="error" variant="contained" sx={{ textTransform: 'none', fontSize: textVar.sm }}>
                        {deleting ? <CircularProgress size={14} /> : t('app.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
