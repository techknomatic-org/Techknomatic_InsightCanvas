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
    alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TableChartIcon from '@mui/icons-material/TableChart';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
        <Box
            sx={{
                maxWidth: 820,
                width: '100%',
                mx: 'auto',
                p: { xs: 2, sm: 3, md: 4 },
                pb: { xs: 6, md: 8 },
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 1.5,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        onClick={onBack}
                        sx={{
                            mr: 1.5,
                            color: '#1e293b',
                            bgcolor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' },
                        }}
                    >
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                color: '#0f172a',
                                letterSpacing: '-0.025em',
                                fontSize: { xs: '20px', sm: '24px' },
                                fontFamily: "'Inter', 'Roboto', sans-serif",
                            }}
                        >
                            Select Tables to Analyze
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <StorageIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
                                Database: <strong style={{ color: '#0f172a' }}>{databaseName}</strong>
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Chip
                    icon={<CheckCircleIcon style={{ fontSize: 16, color: selectedTables.size > 0 ? '#ffffff' : '#64748b' }} />}
                    label={`${selectedTables.size} / ${tables.length} selected`}
                    sx={{
                        fontWeight: 700,
                        fontSize: '12.5px',
                        py: 2,
                        px: 0.5,
                        borderRadius: '10px',
                        bgcolor: selectedTables.size > 0 ? '#1B75BB' : '#f1f5f9',
                        color: selectedTables.size > 0 ? '#ffffff' : '#64748b',
                        border: selectedTables.size > 0 ? 'none' : '1px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                    }}
                />
            </Box>

            {loading ? (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 10,
                        gap: 2,
                        bgcolor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                    }}
                >
                    <CircularProgress size={36} sx={{ color: '#1B75BB' }} />
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        Discovering schema and loading catalog tables...
                    </Typography>
                </Box>
            ) : error ? (
                <Box sx={{ mt: 1 }}>
                    <Alert
                        severity="error"
                        sx={{ borderRadius: '12px' }}
                        action={
                            onRetry && (
                                <Button color="inherit" size="small" onClick={onRetry} sx={{ fontWeight: 600 }}>
                                    Retry
                                </Button>
                            )
                        }
                    >
                        {error}
                    </Alert>
                </Box>
            ) : (
                <Card
                    sx={{
                        borderRadius: '18px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                        bgcolor: '#ffffff',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Filter & Controls Bar */}
                    <Box
                        sx={{
                            p: { xs: 2, sm: 2.5 },
                            bgcolor: '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'center',
                        }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Filter tables by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                            sx={{
                                bgcolor: '#ffffff',
                                borderRadius: '10px',
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    '& fieldset': { borderColor: '#e2e8f0' },
                                    '&:hover fieldset': { borderColor: '#cbd5e1' },
                                    '&.Mui-focused fieldset': { borderColor: '#1B75BB' },
                                },
                            }}
                        />
                        <Button
                            size="medium"
                            variant="outlined"
                            onClick={isAllSelected ? onDeselectAll : onSelectAll}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '13px',
                                whiteSpace: 'nowrap',
                                color: '#1B75BB',
                                borderColor: '#bfdbfe',
                                bgcolor: '#eff6ff',
                                borderRadius: '10px',
                                px: 2,
                                py: 0.9,
                                '&:hover': {
                                    bgcolor: '#dbeafe',
                                    borderColor: '#93c5fd',
                                },
                            }}
                        >
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                    </Box>

                    {/* Table List Container */}
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {filteredTables.length === 0 ? (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <TableChartIcon sx={{ fontSize: 44, color: '#cbd5e1', mb: 1.5 }} />
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569', mb: 0.5 }}>
                                    {searchTerm ? 'No tables match your search filter' : 'No tables found in this database'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {searchTerm ? 'Try a different table name or clear the search' : 'Ensure database permissions allow table listing'}
                                </Typography>
                            </Box>
                        ) : (
                            <List
                                sx={{
                                    p: 0,
                                    maxHeight: { xs: 260, sm: 320, md: 360, lg: 400 },
                                    overflowY: 'auto',
                                    pr: 0.5,
                                    '&::-webkit-scrollbar': {
                                        width: '6px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f5f9',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#cbd5e1',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            background: '#94a3b8',
                                        },
                                    },
                                }}
                            >
                                {filteredTables.map((t) => {
                                    const isSelected = selectedTables.has(t.name);
                                    return (
                                        <ListItem
                                            key={t.id || t.name}
                                            disablePadding
                                            sx={{
                                                borderRadius: '10px',
                                                mb: 0.75,
                                                bgcolor: isSelected ? alpha('#1B75BB', 0.06) : '#ffffff',
                                                border: isSelected ? '1px solid #93c5fd' : '1px solid #f1f5f9',
                                                transition: 'all 0.15s ease',
                                                '&:hover': {
                                                    bgcolor: isSelected ? alpha('#1B75BB', 0.1) : '#f8fafc',
                                                    borderColor: isSelected ? '#60a5fa' : '#e2e8f0',
                                                },
                                            }}
                                        >
                                            <ListItemButton
                                                onClick={() => onToggleTable(t.name)}
                                                sx={{ py: 1.25, px: 1.75, borderRadius: '10px' }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 38 }}>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={isSelected}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        size="small"
                                                        sx={{
                                                            color: '#94a3b8',
                                                            '&.Mui-checked': { color: '#1B75BB' },
                                                        }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemIcon sx={{ minWidth: 34, color: isSelected ? '#1B75BB' : '#64748b' }}>
                                                    <TableChartIcon fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={t.name}
                                                    primaryTypographyProps={{
                                                        fontWeight: isSelected ? 700 : 500,
                                                        color: isSelected ? '#0f172a' : '#334155',
                                                        fontSize: '14.5px',
                                                        fontFamily: "'Inter', 'Roboto', sans-serif",
                                                    }}
                                                />
                                                {isSelected && (
                                                    <Chip
                                                        label="Ready"
                                                        size="small"
                                                        sx={{
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            bgcolor: '#dbeafe',
                                                            color: '#1d4ed8',
                                                            borderRadius: '6px',
                                                            height: '22px',
                                                        }}
                                                    />
                                                )}
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}
                    </CardContent>

                    {/* Bottom Sticky Action Bar */}
                    <Box
                        sx={{
                            p: { xs: 2, sm: 2.5 },
                            bgcolor: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1.5,
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={onBack}
                            startIcon={<ArrowBackIcon fontSize="small" />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '10px',
                                borderColor: '#cbd5e1',
                                color: '#475569',
                                bgcolor: '#ffffff',
                                px: 2.5,
                                py: 1,
                                '&:hover': {
                                    borderColor: '#94a3b8',
                                    bgcolor: '#f1f5f9',
                                },
                            }}
                        >
                            Back to Databases
                        </Button>

                        <Button
                            variant="contained"
                            endIcon={<AutoAwesomeIcon />}
                            disabled={selectedTables.size === 0}
                            onClick={onProceed}
                            sx={{
                                bgcolor: '#1B75BB',
                                background: 'linear-gradient(135deg, #1B75BB 0%, #135c96 100%)',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '14.5px',
                                borderRadius: '10px',
                                px: 3.5,
                                py: 1.1,
                                boxShadow: '0 4px 14px rgba(27, 117, 187, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #135c96 0%, #0d4675 100%)',
                                    boxShadow: '0 6px 20px rgba(27, 117, 187, 0.45)',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: '#e2e8f0',
                                    background: '#e2e8f0',
                                    color: '#94a3b8',
                                },
                            }}
                        >
                            Proceed to Analysis ({selectedTables.size} {selectedTables.size === 1 ? 'Table' : 'Tables'})
                        </Button>
                    </Box>
                </Card>
            )}
        </Box>
    );
};

