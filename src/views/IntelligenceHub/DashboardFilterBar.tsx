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
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { FilterSpec } from './intelligenceTypes';

interface DashboardFilterBarProps {
    filter: FilterSpec;
    onFilterChange: (value: string | number) => void;
    filtering?: boolean;
    dashboardTitle?: string;
    dashboardDescription?: string;
}

/**
 * Detect the domain from the dashboard title/description and table names,
 * then return the most appropriate MUI icon.
 */
function getDomainIcon(title?: string, description?: string, tableName?: string) {
    const combined = [title, description, tableName].filter(Boolean).join(' ').toLowerCase();

    if (/manufactur|factory|production|machine|assembly|quality/.test(combined))
        return <FactoryOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/\bhr\b|human.?resource|employee|workforce|recruit|talent|payroll|attendance/.test(combined))
        return <PeopleAltOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/sale|revenue|retail|e.?commerce|store|order|customer|shop|commerce/.test(combined))
        return <StorefrontOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/financ|bank|loan|invest|portfolio|account|ledger|budget|expense/.test(combined))
        return <AccountBalanceOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/education|school|student|course|university|academic|grade|exam/.test(combined))
        return <SchoolOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/health|hospital|patient|medical|clinical|pharma|drug|diagnosis/.test(combined))
        return <LocalHospitalOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/logistics|shipping|supply.?chain|warehouse|fleet|delivery|transport/.test(combined))
        return <LocalShippingOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/movie|film|entertainment|media|stream|content|video/.test(combined))
        return <MovieOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/game|gaming|esport|player/.test(combined))
        return <SportsEsportsOutlinedIcon sx={{ fontSize: 22 }} />;
    if (/analytics|insight|intelligence|data|metric|performance|kpi/.test(combined))
        return <InsightsOutlinedIcon sx={{ fontSize: 22 }} />;

    return <BarChartOutlinedIcon sx={{ fontSize: 22 }} />;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
    filter,
    onFilterChange,
    filtering = false,
    dashboardTitle,
    dashboardDescription,
}) => {
    const options = filter.options && filter.options.length > 0 ? filter.options : ['All'];
    const selected = filter.selected_value ?? 'All';
    const slicerLabel = filter.label || filter.field || 'Global Filter';

    const domainIcon = getDomainIcon(dashboardTitle, dashboardDescription, filter.table);

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.8,
                px: 2.5,
                mb: 2.5,
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
        >
            {/* LEFT: Domain Icon + Dashboard Title & Description */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 0, flex: 1 }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #1B75BB 0%, #4F46E5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(27, 117, 187, 0.25)',
                    }}
                >
                    {domainIcon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 800,
                            color: '#001d52',
                            fontSize: '15px',
                            lineHeight: 1.25,
                        }}
                    >
                        {dashboardTitle || 'Dashboard'}
                    </Typography>
                    {dashboardDescription && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: '#64748b',
                                fontSize: '11.5px',
                                lineHeight: 1.35,
                                display: 'block',
                                mt: 0.3,
                            }}
                        >
                            {dashboardDescription}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* RIGHT: Slicer Filter with Icon + Label Above Dropdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexShrink: 0 }}>
                {filtering && <CircularProgress size={18} sx={{ color: '#1B75BB', mr: 0.5 }} />}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                    {/* Top Row: Funnel Icon + Label */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <FilterAltOutlinedIcon sx={{ fontSize: 13, color: '#64748b' }} />
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '10px',
                                letterSpacing: '0.06em',
                                color: '#64748b',
                                lineHeight: 1,
                            }}
                        >
                            {slicerLabel}
                        </Typography>
                    </Box>

                    {/* Bottom Row: Select Dropdown Box */}
                    <FormControl size="small" sx={{ minWidth: 190 }}>
                        <Select
                            value={selected}
                            onChange={(e) => onFilterChange(e.target.value)}
                            disabled={filtering}
                            sx={{
                                height: 36,
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 500,
                                bgcolor: '#f8fafc',
                                '& .MuiSelect-select': { py: 0.8, pr: 3 },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#cbd5e1',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#1B75BB',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#1B75BB',
                                    borderWidth: 1.5,
                                },
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
            </Box>
        </Paper>
    );
};
