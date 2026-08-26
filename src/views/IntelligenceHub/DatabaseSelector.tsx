// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    InputAdornment,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Alert,
    IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ConnectorInstance } from '../../components/ComponentType';

export interface DatabaseItem {
    id: string;
    name: string;
    nodeType: string;
    path: string[];
    children?: any[];
    tableCount?: number;
}

interface DatabaseSelectorProps {
    connector: ConnectorInstance;
    databases: DatabaseItem[];
    loading: boolean;
    error: string | null;
    onSelectDatabase: (db: DatabaseItem) => void;
    onBack: () => void;
    onRetry?: () => void;
}

export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
    connector,
    databases,
    loading,
    error,
    onSelectDatabase,
    onBack,
    onRetry,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredDatabases = useMemo(() => {
        if (!searchTerm.trim()) return databases;
        const q = searchTerm.toLowerCase();
        return databases.filter((db) => db.name.toLowerCase().includes(q));
    }, [databases, searchTerm]);

    return (
        <Box sx={{ maxWidth: 700, mx: 'auto', p: { xs: 2, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={onBack} sx={{ mr: 1.5, color: '#001d52' }}>
                    <ArrowBackIcon />
                </IconButton>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#001d52', letterSpacing: '-0.02em' }}>
                        Select Database / Schema
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Source: <strong>{connector.display_name || connector.id}</strong> ({databases.length} database{databases.length === 1 ? '' : 's'} available)
                    </Typography>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                    <CircularProgress size={32} sx={{ color: '#1B75BB' }} />
                    <Typography variant="body2" color="text.secondary">
                        Loading databases and schemas...
                    </Typography>
                </Box>
            ) : error ? (
                <Box sx={{ mt: 2 }}>
                    <Alert
                        severity="error"
                        action={
                            onRetry && (
                                <Button color="inherit" size="small" onClick={onRetry}>
                                    Retry
                                </Button>
                            )
                        }
                    >
                        {error}
                    </Alert>
                </Box>
            ) : (
                <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    <CardContent sx={{ p: 2.5 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search databases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />

                        {filteredDatabases.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <StorageIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    {searchTerm ? 'No databases match your search' : 'No databases found in this data source'}
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }}>
                                {filteredDatabases.map((db) => (
                                    <ListItemButton
                                        key={db.id}
                                        onClick={() => onSelectDatabase(db)}
                                        sx={{
                                            borderRadius: '8px',
                                            mb: 0.75,
                                            p: 1.5,
                                            border: '1px solid #f1f5f9',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                bgcolor: 'rgba(27, 117, 187, 0.05)',
                                                borderColor: '#93c5fd',
                                                transform: 'translateX(3px)',
                                            },
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, color: '#1B75BB' }}>
                                            <StorageIcon fontSize="medium" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={db.name}
                                            primaryTypographyProps={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}
                                        />
                                        {db.tableCount !== undefined && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: '#475569',
                                                    bgcolor: '#f1f5f9',
                                                    px: 1.2,
                                                    py: 0.4,
                                                    borderRadius: '12px',
                                                    mr: 1,
                                                }}
                                            >
                                                {db.tableCount} table{db.tableCount === 1 ? '' : 's'}
                                            </Box>
                                        )}
                                        <ChevronRightIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </ListItemButton>
                                ))}
                            </List>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};
