// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getConnectorIcon } from '../../icons';
import { ConnectorInstance } from '../../components/ComponentType';

interface DataSourceSelectorProps {
    connectors: ConnectorInstance[];
    loading: boolean;
    error: string | null;
    onSelectSource: (connector: ConnectorInstance) => void;
    onAddConnection?: () => void;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
    connectors,
    loading,
    error,
    onSelectSource,
    onAddConnection,
}) => {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
                <CircularProgress size={36} sx={{ color: '#1B75BB' }} />
                <Typography variant="body2" color="text.secondary">
                    Loading connected data sources...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, width: '100%', mx: 'auto', p: { xs: 2, sm: 3, md: 4 }, pb: { xs: 6, md: 8 } }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#001d52', mb: 1, letterSpacing: '-0.02em' }}>
                    Select a Connected Data Source
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Choose a database or local repository to analyze and generate intelligent dashboards.
                </Typography>
            </Box>

            {connectors.length === 0 ? (
                <Card sx={{ p: 4, textAlign: 'center', borderRadius: '16px', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
                    <StorageIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 0.5 }}>
                        No Connected Data Sources Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 450, mx: 'auto' }}>
                        Connect to a database (MySQL, PostgreSQL, etc.) or a local folder to get started with BI HUB.
                    </Typography>
                    {onAddConnection && (
                        <Button variant="contained" onClick={onAddConnection} sx={{ bgcolor: '#1B75BB', textTransform: 'none', borderRadius: '8px' }}>
                            Add New Connection
                        </Button>
                    )}
                </Card>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 3,
                    }}
                >
                    {connectors.map((conn) => (
                        <Card
                            key={conn.id}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 20px rgba(0,29,82,0.08)',
                                    borderColor: '#93c5fd',
                                },
                            }}
                        >
                            <CardContent sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '10px',
                                        bgcolor: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#1B75BB',
                                    }}>
                                        {getConnectorIcon(conn.icon || conn.source_type || 'default', { sx: { fontSize: 24 } })}
                                    </Box>
                                    <Chip
                                        size="small"
                                        icon={<CheckCircleOutlineIcon sx={{ fontSize: '14px !important' }} />}
                                        label="Connected"
                                        sx={{
                                            bgcolor: '#ecfdf5',
                                            color: '#059669',
                                            fontWeight: 600,
                                            fontSize: '11px',
                                            border: '1px solid #a7f3d0',
                                        }}
                                    />
                                </Box>

                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0f172a', mb: 0.5 }}>
                                    {conn.display_name || conn.id}
                                </Typography>

                                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                    {conn.type_name || conn.source_type || 'Relational Database'}
                                </Typography>

                                <Box sx={{ mt: 'auto', pt: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        endIcon={<ArrowForwardIcon />}
                                        onClick={() => onSelectSource(conn)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderRadius: '8px',
                                            borderColor: '#cbd5e1',
                                            color: '#001d52',
                                            '&:hover': {
                                                borderColor: '#1B75BB',
                                                bgcolor: 'rgba(27, 117, 187, 0.04)',
                                            },
                                        }}
                                    >
                                        Select Database
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
};
