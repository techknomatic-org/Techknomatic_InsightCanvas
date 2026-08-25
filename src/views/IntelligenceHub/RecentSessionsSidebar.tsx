// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { IntelligenceSession } from './intelligenceTypes';

interface RecentSessionsSidebarProps {
    sessions: IntelligenceSession[];
    activeSessionId: string | null;
    onSelectSession: (session: IntelligenceSession) => void;
    onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
    open?: boolean;
    onClose?: () => void;
    width?: number;
}

export const RecentSessionsSidebar: React.FC<RecentSessionsSidebarProps> = ({
    sessions,
    activeSessionId,
    onSelectSession,
    onDeleteSession,
    open = false,
    onClose,
    width = 280,
}) => {
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
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon sx={{ color: '#1B75BB', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#001d52', fontSize: '13px' }}>
                        Recent Dashboards
                    </Typography>
                    <Chip size="small" label={sessions.length} sx={{ height: 18, fontSize: '10px', fontWeight: 600 }} />
                </Box>
                {onClose && (
                    <IconButton size="small" onClick={onClose} sx={{ color: '#64748b' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            <Divider />

            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.2 }}>
                {sessions.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                        <DashboardIcon sx={{ fontSize: 32, color: '#cbd5e1', mb: 1 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            No saved sessions yet. Generated dashboards will appear here automatically.
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {sessions.map((sess) => {
                            const isSelected = sess.id === activeSessionId;
                            const dateStr = sess.created_at
                                ? new Date(sess.created_at).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : '';

                            return (
                                <ListItemButton
                                    key={sess.id}
                                    onClick={() => onSelectSession(sess)}
                                    sx={{
                                        p: 1.5,
                                        mb: 0.8,
                                        borderRadius: '10px',
                                        bgcolor: isSelected ? '#ffffff' : 'transparent',
                                        border: isSelected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                        boxShadow: isSelected ? '0 2px 8px rgba(27,117,187,0.08)' : 'none',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                            bgcolor: '#ffffff',
                                            borderColor: isSelected ? '#93c5fd' : '#cbd5e1',
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={sess.title || 'Untitled Dashboard'}
                                        secondary={
                                            <React.Fragment>
                                                <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '10.5px', mt: 0.3 }}>
                                                    {dateStr}
                                                </Typography>
                                                {sess.tables && sess.tables.length > 0 && (
                                                    <Typography component="span" variant="caption" sx={{ display: 'block', color: '#1B75BB', fontSize: '10.5px', fontWeight: 600 }}>
                                                        {sess.tables.join(', ')}
                                                    </Typography>
                                                )}
                                            </React.Fragment>
                                        }
                                        primaryTypographyProps={{
                                            fontWeight: isSelected ? 700 : 600,
                                            fontSize: '12.5px',
                                            color: isSelected ? '#001d52' : '#1e293b',
                                            noWrap: true,
                                        }}
                                    />
                                    <Tooltip title="Delete session">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => onDeleteSession(sess.id, e)}
                                            sx={{
                                                p: 0.5,
                                                color: '#94a3b8',
                                                '&:hover': { color: '#ef4444' },
                                            }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
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
