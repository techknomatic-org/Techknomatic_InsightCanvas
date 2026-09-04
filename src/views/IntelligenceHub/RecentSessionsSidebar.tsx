// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    IconButton,
    Divider,
    Tooltip,
    Chip,
    Drawer,
    TextField,
    InputAdornment,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SearchIcon from '@mui/icons-material/Search';
import { IntelligenceSession } from './intelligenceTypes';

interface RecentSessionsSidebarProps {
    sessions: IntelligenceSession[];
    activeSessionId: string | null;
    onSelectSession: (session: IntelligenceSession) => void;
    onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
    onTogglePin?: (sessionId: string, e: React.MouseEvent) => void;
    onToggleLike?: (sessionId: string, e: React.MouseEvent) => void;
    open?: boolean;
    onClose?: () => void;
    width?: number;
}

const parseSessionDate = (d?: string | null): Date | null => {
    if (!d) return null;
    const hasTimezone = d.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(d) || /[+-]\d{4}$/.test(d);
    const normalized = hasTimezone ? d : `${d}Z`;
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? new Date(d) : parsed;
};

const formatSessionTime = (dateObj: Date): string => {
    const now = new Date();
    const isToday = now.toDateString() === dateObj.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === dateObj.toDateString();

    const timeStr = dateObj.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    if (isToday) {
        return `Today, ${timeStr}`;
    }
    if (isYesterday) {
        return `Yesterday, ${timeStr}`;
    }
    return `${dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${timeStr}`;
};

export const RecentSessionsSidebar: React.FC<RecentSessionsSidebarProps> = ({
    sessions,
    activeSessionId,
    onSelectSession,
    onDeleteSession,
    onTogglePin,
    onToggleLike,
    open = false,
    onClose,
    width = 320,
}) => {
    const [filterType, setFilterType] = useState<'all' | 'pinned' | 'liked'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Count statistics
    const pinnedCount = useMemo(() => sessions.filter((s) => s.pinned).length, [sessions]);
    const likedCount = useMemo(() => sessions.filter((s) => s.liked).length, [sessions]);

    // Filter and sort sessions
    const filteredSessions = useMemo(() => {
        let list = [...sessions];

        // Search text filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter((s) => {
                const titleMatch = (s.title || '').toLowerCase().includes(query);
                const tablesMatch = (s.tables || []).some((t) => t.toLowerCase().includes(query));
                return titleMatch || tablesMatch;
            });
        }

        // Tab filter
        if (filterType === 'pinned') {
            list = list.filter((s) => s.pinned);
        } else if (filterType === 'liked') {
            list = list.filter((s) => s.liked);
        }

        // Sorting: Pinned items at top, then newest updated_at/created_at
        list.sort((a, b) => {
            if (filterType === 'all') {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
            }
            const dateA = a.updated_at || a.created_at || '';
            const dateB = b.updated_at || b.created_at || '';
            return dateB.localeCompare(dateA);
        });

        return list;
    }, [sessions, filterType, searchQuery]);

    const content = (
        <Box
            sx={{
                width,
                height: '100%',
                bgcolor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon sx={{ color: '#1B75BB', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#001d52', fontSize: '14px' }}>
                        Recent Dashboards
                    </Typography>
                    <Chip
                        size="small"
                        label={sessions.length}
                        sx={{
                            height: 20,
                            fontSize: '11px',
                            fontWeight: 700,
                            bgcolor: '#e2e8f0',
                            color: '#334155',
                        }}
                    />
                </Box>
                {onClose && (
                    <IconButton size="small" onClick={onClose} sx={{ color: '#64748b' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Filter Tabs / Pills */}
            <Box sx={{ px: 2, pb: 1 }}>
                <ToggleButtonGroup
                    value={filterType}
                    exclusive
                    onChange={(_, val) => {
                        if (val) setFilterType(val);
                    }}
                    size="small"
                    fullWidth
                    sx={{
                        bgcolor: '#f1f5f9',
                        p: '2px',
                        borderRadius: '8px',
                        '& .MuiToggleButton-root': {
                            border: 'none',
                            borderRadius: '6px !important',
                            py: 0.4,
                            px: 1,
                            textTransform: 'none',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: '#64748b',
                            '&.Mui-selected': {
                                bgcolor: '#ffffff',
                                color: '#001d52',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            },
                        },
                    }}
                >
                    <ToggleButton value="all">
                        All ({sessions.length})
                    </ToggleButton>
                    <ToggleButton value="pinned">
                        <PushPinIcon sx={{ fontSize: 13, mr: 0.4, color: filterType === 'pinned' ? '#1B75BB' : '#94a3b8' }} />
                        Pinned ({pinnedCount})
                    </ToggleButton>
                    <ToggleButton value="liked">
                        <FavoriteIcon sx={{ fontSize: 13, mr: 0.4, color: filterType === 'liked' ? '#ef4444' : '#94a3b8' }} />
                        Liked ({likedCount})
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Search Box */}
            {sessions.length > 4 && (
                <Box sx={{ px: 2, pb: 1 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search dashboards or tables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                </InputAdornment>
                            ),
                            sx: {
                                fontSize: '12px',
                                bgcolor: '#ffffff',
                                borderRadius: '8px',
                                height: 32,
                                '& fieldset': { borderColor: '#e2e8f0' },
                            },
                        }}
                    />
                </Box>
            )}

            <Divider />

            {/* Session Items List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.2 }}>
                {filteredSessions.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                        {filterType === 'pinned' ? (
                            <>
                                <PushPinIcon sx={{ fontSize: 32, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                                    No pinned dashboards yet.
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5, fontSize: '10.5px' }}>
                                    Click the pin icon on any dashboard to keep it at the top.
                                </Typography>
                            </>
                        ) : filterType === 'liked' ? (
                            <>
                                <FavoriteIcon sx={{ fontSize: 32, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                                    No liked dashboards yet.
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5, fontSize: '10.5px' }}>
                                    Click the heart icon on any dashboard to add it to your favorites.
                                </Typography>
                            </>
                        ) : (
                            <>
                                <DashboardIcon sx={{ fontSize: 32, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {searchQuery ? 'No dashboards match your search.' : 'No saved sessions yet. Generated dashboards will appear here.'}
                                </Typography>
                            </>
                        )}
                    </Box>
                ) : (
                    <List disablePadding>
                        {filteredSessions.map((sess) => {
                            const isSelected = sess.id === activeSessionId;
                            const isPinned = Boolean(sess.pinned);
                            const isLiked = Boolean(sess.liked);
                            const rawDate = sess.updated_at || sess.created_at;
                            const parsedDate = rawDate ? parseSessionDate(rawDate) : null;
                            const dateStr = parsedDate ? formatSessionTime(parsedDate) : '';

                            return (
                                <ListItemButton
                                    key={sess.id}
                                    onClick={() => onSelectSession(sess)}
                                    sx={{
                                        p: 1.25,
                                        mb: 0.8,
                                        borderRadius: '10px',
                                        bgcolor: isSelected ? '#ffffff' : '#ffffff',
                                        border: isSelected
                                            ? '1.5px solid #2563eb'
                                            : isPinned
                                            ? '1px solid #bfdbfe'
                                            : '1px solid #e2e8f0',
                                        borderLeft: isPinned
                                            ? '3.5px solid #1B75BB'
                                            : isSelected
                                            ? '3.5px solid #2563eb'
                                            : '1px solid #e2e8f0',
                                        boxShadow: isSelected
                                            ? '0 2px 8px rgba(37,99,235,0.12)'
                                            : isPinned
                                            ? '0 1px 4px rgba(27,117,187,0.06)'
                                            : 'none',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        position: 'relative',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                            bgcolor: '#f8fafc',
                                            borderColor: isSelected ? '#2563eb' : '#93c5fd',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.5 }}>
                                                {isPinned && (
                                                    <Tooltip title="Pinned to top">
                                                        <PushPinIcon sx={{ fontSize: 13, color: '#1B75BB', flexShrink: 0 }} />
                                                    </Tooltip>
                                                )}
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: isSelected ? 600 : 500,
                                                        fontSize: '12.5px',
                                                        color: isSelected ? '#1B75BB' : '#1e293b',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {sess.title || 'Untitled Dashboard'}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <React.Fragment>
                                                <Typography
                                                    component="span"
                                                    variant="caption"
                                                    sx={{ display: 'block', color: 'text.secondary', fontSize: '10.5px', mt: 0.3 }}
                                                >
                                                    {dateStr}
                                                </Typography>
                                                {sess.tables && sess.tables.length > 0 && (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{
                                                            display: 'block',
                                                            color: '#1B75BB',
                                                            fontSize: '10.5px',
                                                            fontWeight: 600,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: 190,
                                                        }}
                                                    >
                                                        {sess.tables.join(', ')}
                                                    </Typography>
                                                )}
                                            </React.Fragment>
                                        }
                                    />

                                    {/* Action Buttons: Pin, Like, Delete */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.2,
                                            ml: 0.5,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {/* Pin Button */}
                                        <Tooltip title={isPinned ? 'Unpin dashboard' : 'Pin to top'}>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    if (onTogglePin) onTogglePin(sess.id, e);
                                                }}
                                                sx={{
                                                    p: 0.4,
                                                    color: isPinned ? '#1B75BB' : '#94a3b8',
                                                    bgcolor: isPinned ? '#eff6ff' : 'transparent',
                                                    '&:hover': {
                                                        color: '#1B75BB',
                                                        bgcolor: '#dbeafe',
                                                    },
                                                }}
                                            >
                                                {isPinned ? (
                                                    <PushPinIcon sx={{ fontSize: 15 }} />
                                                ) : (
                                                    <PushPinOutlinedIcon sx={{ fontSize: 15 }} />
                                                )}
                                            </IconButton>
                                        </Tooltip>

                                        {/* Like Button */}
                                        <Tooltip title={isLiked ? 'Unlike dashboard' : 'Like dashboard'}>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    if (onToggleLike) onToggleLike(sess.id, e);
                                                }}
                                                sx={{
                                                    p: 0.4,
                                                    color: isLiked ? '#ef4444' : '#94a3b8',
                                                    bgcolor: isLiked ? '#fef2f2' : 'transparent',
                                                    '&:hover': {
                                                        color: '#ef4444',
                                                        bgcolor: '#fee2e2',
                                                    },
                                                }}
                                            >
                                                {isLiked ? (
                                                    <FavoriteIcon sx={{ fontSize: 15 }} />
                                                ) : (
                                                    <FavoriteBorderIcon sx={{ fontSize: 15 }} />
                                                )}
                                            </IconButton>
                                        </Tooltip>

                                        {/* Delete Button */}
                                        <Tooltip title="Delete session">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => onDeleteSession(sess.id, e)}
                                                sx={{
                                                    p: 0.4,
                                                    color: '#94a3b8',
                                                    '&:hover': {
                                                        color: '#ef4444',
                                                        bgcolor: '#fee2e2',
                                                    },
                                                }}
                                            >
                                                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}
            </Box>
        </Box>
    );

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width, bgcolor: '#f8fafc' },
            }}
        >
            {content}
        </Drawer>
    );
};
