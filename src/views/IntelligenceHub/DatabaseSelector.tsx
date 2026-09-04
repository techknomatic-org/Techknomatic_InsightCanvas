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
    Tooltip,
    Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorageIcon from '@mui/icons-material/Storage';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TableChartIcon from '@mui/icons-material/TableChart';
import DnsIcon from '@mui/icons-material/Dns';
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
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                bgcolor: '#f8fafc',
            }}
        >
            {/* Top Fixed Header Bar with Top-Left Back Button */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: { xs: 1.5, md: 2.5 },
                    py: 1,
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    flexShrink: 0,
                    zIndex: 10,
                }}
            >
                {/* Top-Left Corner Back Button matching other screens */}
                <Tooltip title="Back to Data Sources">
                    <IconButton
                        onClick={onBack}
                        size="small"
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            color: '#1e293b',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                                bgcolor: '#f1f5f9',
                                borderColor: '#cbd5e1',
                                color: '#001d52',
                            },
                        }}
                    >
                        <ArrowBackIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Scrollable Main Content Container */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    p: { xs: 2, sm: 3, md: 3.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ maxWidth: 840, width: '100%' }}>
                    {/* Header: Title, Source Badge & Count */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2.5,
                            flexWrap: 'wrap',
                            gap: 1.5,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 800,
                                    color: '#001d52',
                                    letterSpacing: '-0.025em',
                                    fontSize: { xs: '20px', sm: '23px' },
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                }}
                            >
                                Select Database / Schema
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.4 }}>
                                <DnsIcon sx={{ fontSize: 16, color: '#64748b' }} />
                                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
                                    Source: <strong style={{ color: '#001d52' }}>{connector.display_name || connector.id}</strong>
                                </Typography>
                            </Box>
                        </Box>

                        <Chip
                            icon={<StorageIcon style={{ fontSize: 15, color: '#1B75BB' }} />}
                            label={`${databases.length} database${databases.length === 1 ? '' : 's'} available`}
                            sx={{
                                fontWeight: 600,
                                fontSize: '12px',
                                height: 32,
                                px: 0.5,
                                borderRadius: '8px',
                                bgcolor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                            }}
                        />
                    </Box>

                    {/* Loading State */}
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
                                Discovering databases and schemas...
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
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                                bgcolor: '#ffffff',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Search Bar Header */}
                            <Box
                                sx={{
                                    p: { xs: 2, sm: 2.25 },
                                    bgcolor: '#f8fafc',
                                    borderBottom: '1px solid #f1f5f9',
                                }}
                            >
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search databases or schemas..."
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
                                                <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.5 }}>
                                                    <ClearIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#ffffff',
                                            fontSize: '13.5px',
                                            '& fieldset': { borderColor: '#e2e8f0' },
                                            '&:hover fieldset': { borderColor: '#cbd5e1' },
                                            '&.Mui-focused fieldset': { borderColor: '#1B75BB', borderWidth: '1.5px' },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Database List */}
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                                {filteredDatabases.length === 0 ? (
                                    <Box sx={{ py: 8, textAlign: 'center' }}>
                                        <StorageIcon sx={{ fontSize: 44, color: '#cbd5e1', mb: 1.5 }} />
                                        <Typography variant="body1" sx={{ color: '#475569', fontWeight: 600, mb: 0.5 }}>
                                            {searchTerm ? 'No databases found' : 'No databases available'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>
                                            {searchTerm
                                                ? `No databases match "${searchTerm}". Try another search.`
                                                : 'No databases were discovered in this connected source.'}
                                        </Typography>
                                        {searchTerm && (
                                            <Button
                                                size="small"
                                                onClick={() => setSearchTerm('')}
                                                sx={{ mt: 2, textTransform: 'none', fontWeight: 600, color: '#1B75BB' }}
                                            >
                                                Clear search filter
                                            </Button>
                                        )}
                                    </Box>
                                ) : (
                                    <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {filteredDatabases.map((db) => (
                                            <ListItemButton
                                                key={db.id}
                                                onClick={() => onSelectDatabase(db)}
                                                sx={{
                                                    borderRadius: '12px',
                                                    p: { xs: 1.5, sm: 1.75 },
                                                    border: '1px solid #e2e8f0',
                                                    bgcolor: '#ffffff',
                                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&:hover': {
                                                        bgcolor: 'rgba(27, 117, 187, 0.04)',
                                                        borderColor: '#93c5fd',
                                                        boxShadow: '0 3px 12px rgba(27, 117, 187, 0.08)',
                                                        transform: 'translateY(-1px)',
                                                        '& .chevron-icon': {
                                                            color: '#1B75BB',
                                                            transform: 'translateX(3px)',
                                                        },
                                                        '& .db-icon-box': {
                                                            bgcolor: '#1B75BB',
                                                            color: '#ffffff',
                                                        },
                                                    },
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 44 }}>
                                                    <Box
                                                        className="db-icon-box"
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: '10px',
                                                            bgcolor: '#f1f5f9',
                                                            color: '#1B75BB',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.18s ease',
                                                        }}
                                                    >
                                                        <StorageIcon sx={{ fontSize: 20 }} />
                                                    </Box>
                                                </ListItemIcon>

                                                <ListItemText
                                                    primary={db.name}
                                                    primaryTypographyProps={{
                                                        fontWeight: 700,
                                                        color: '#001d52',
                                                        fontSize: '15px',
                                                        fontFamily: "'Inter', 'Roboto', sans-serif",
                                                    }}
                                                    secondary={
                                                        db.nodeType ? (
                                                            <Typography
                                                                component="span"
                                                                variant="caption"
                                                                sx={{ color: '#64748b', fontSize: '11.5px', textTransform: 'capitalize' }}
                                                            >
                                                                Type: {db.nodeType}
                                                            </Typography>
                                                        ) : undefined
                                                    }
                                                />

                                                {db.tableCount !== undefined && (
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            color: '#475569',
                                                            bgcolor: '#f1f5f9',
                                                            px: 1.25,
                                                            py: 0.5,
                                                            borderRadius: '8px',
                                                            mr: 1.5,
                                                            border: '1px solid #e2e8f0',
                                                        }}
                                                    >
                                                        <TableChartIcon sx={{ fontSize: 14, color: '#64748b' }} />
                                                        {db.tableCount} table{db.tableCount === 1 ? '' : 's'}
                                                    </Box>
                                                )}

                                                <ChevronRightIcon
                                                    className="chevron-icon"
                                                    sx={{
                                                        color: '#94a3b8',
                                                        fontSize: 22,
                                                        transition: 'all 0.18s ease',
                                                    }}
                                                />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
