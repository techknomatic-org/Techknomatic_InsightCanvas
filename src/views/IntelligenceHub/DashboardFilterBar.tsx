// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import {
    Box,
    Typography,
    FormControl,
    Select,
    MenuItem,
    Paper,
    CircularProgress,
} from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { FilterSpec } from './intelligenceTypes';

interface DashboardFilterBarProps {
    filter: FilterSpec;
    onFilterChange: (value: string | number) => void;
    filtering?: boolean;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
    filter,
    onFilterChange,
    filtering = false,
}) => {
    const options = filter.options && filter.options.length > 0 ? filter.options : ['All'];
    const selected = filter.selected_value ?? 'All';
    const label = filter.label || filter.field || 'Global Dimension Filter';

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.5,
                px: 2.5,
                mb: 2.5,
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: 'rgba(27, 117, 187, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1B75BB',
                }}>
                    <FilterAltOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
                        Dashboard Slice Filter
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {label} {filter.table ? `(${filter.table})` : ''}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {filtering && <CircularProgress size={18} sx={{ color: '#1B75BB' }} />}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                        value={selected}
                        onChange={(e) => onFilterChange(e.target.value)}
                        disabled={filtering}
                        sx={{
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            bgcolor: '#f8fafc',
                            '& .MuiSelect-select': { py: 0.8 },
                        }}
                    >
                        {options.map((opt) => (
                            <MenuItem key={String(opt)} value={opt} sx={{ fontSize: '13px' }}>
                                {String(opt)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        </Paper>
    );
};
