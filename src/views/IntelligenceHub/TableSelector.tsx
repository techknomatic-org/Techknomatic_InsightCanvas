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
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Checkbox,
    Chip,
    CircularProgress,
    Alert,
    IconButton,
    Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TableChartIcon from '@mui/icons-material/TableChart';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export interface CatalogTableItem {
    id: string;
    name: string;
    path: string[];
    metadata?: Record<string, any>;
}

interface TableSelectorProps {
    databaseName: string;
    tables: CatalogTableItem[];
    selectedTables: Set<string>;
    loading: boolean;
    error: string | null;
    onToggleTable: (tableName: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onProceed: () => void;
    onBack: () => void;
    onRetry?: () => void;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
    databaseName,
    tables,
    selectedTables,
    loading,
    error,
    onToggleTable,
    onSelectAll,
    onDeselectAll,
    onProceed,
    onBack,
    onRetry,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTables = useMemo(() => {
        if (!searchTerm.trim()) return tables;
        const q = searchTerm.toLowerCase();
        return tables.filter((t) => t.name.toLowerCase().includes(q));
    }, [tables, searchTerm]);

    const isAllSelected = filteredTables.length > 0 && filteredTables.every((t) => selectedTables.has(t.name));

    return (
        <Box sx={{ maxWidth: 780, mx: 'auto', p: { xs: 2, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={onBack} sx={{ mr: 1.5, color: '#001d52' }}>
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#001d52', letterSpacing: '-0.02em' }}>
                        Select Tables to Analyze
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Database: <strong>{databaseName}</strong>
                    </Typography>
                </Box>
                <Chip
                    label={`${selectedTables.size} selected`}
                    color={selectedTables.size > 0 ? 'primary' : 'default'}
                    sx={{
                        fontWeight: 600,
                        bgcolor: selectedTables.size > 0 ? '#1B75BB' : '#f1f5f9',
                        color: selectedTables.size > 0 ? '#ffffff' : '#64748b',
                    }}
                />
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                    <CircularProgress size={32} sx={{ color: '#1B75BB' }} />
                    <Typography variant="body2" color="text.secondary">
                        Loading tables...
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
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search tables..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                size="small"
                                variant="text"
                                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                                sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', color: '#1B75BB' }}
                            >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                        </Box>

                        {filteredTables.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <TableChartIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    {searchTerm ? 'No tables match your search' : 'No tables available in this database'}
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }}>
                                {filteredTables.map((t) => {
                                    const isSelected = selectedTables.has(t.name);
                                    return (
                                        <ListItem
                                            key={t.id || t.name}
                                            disablePadding
                                            sx={{
                                                borderRadius: '8px',
                                                mb: 0.5,
                                                bgcolor: isSelected ? 'rgba(27, 117, 187, 0.05)' : 'transparent',
                                                border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                                            }}
                                        >
                                            <ListItemButton
                                                onClick={() => onToggleTable(t.name)}
                                                sx={{ py: 1, px: 1.5, borderRadius: '8px' }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={isSelected}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        size="small"
                                                        sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#1B75BB' } }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemIcon sx={{ minWidth: 32, color: isSelected ? '#1B75BB' : '#64748b' }}>
                                                    <TableChartIcon fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={t.name}
                                                    primaryTypographyProps={{
                                                        fontWeight: isSelected ? 600 : 500,
                                                        color: isSelected ? '#001d52' : '#334155',
                                                        fontSize: '14px',
                                                    }}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}

                        <Divider sx={{ my: 2.5 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button variant="outlined" onClick={onBack} sx={{ textTransform: 'none', borderRadius: '8px', borderColor: '#cbd5e1', color: '#475569' }}>
                                Back
                            </Button>
                            <Button
                                variant="contained"
                                endIcon={<AutoAwesomeIcon />}
                                disabled={selectedTables.size === 0}
                                onClick={onProceed}
                                sx={{
                                    bgcolor: '#1B75BB',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    px: 3,
                                    boxShadow: '0 4px 12px rgba(27, 117, 187, 0.25)',
                                    '&:hover': { bgcolor: '#145d97' },
                                }}
                            >
                                Proceed to Analysis ({selectedTables.size})
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};
