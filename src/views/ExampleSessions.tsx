// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import {
    Typography,
    Box,
    Card,
} from '@mui/material';
import { StreamIcon } from '../icons';
import { textVar } from '../app/layout';

// Example session data for pre-built sessions
export interface ExampleSession {
    id: string;
    title: string;
    description: string;
    previewImage: string;
    workspace: string;       // path to workspace zip (e.g. /demos/demo_movies.zip)
    live: boolean;
}

export const exampleSessions: ExampleSession[] = [];

export async function fetchExampleSessions(): Promise<ExampleSession[]> {
    return [];
}

import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

// Crisp vector fallback chart thumbnails matching reference image
const DemoChartThumbnail: React.FC<{ id: string; src?: string }> = ({ id, src }) => {
    const [imgError, setImgError] = React.useState(false);

    if (src && !imgError) {
        return (
            <Box
                component="img"
                src={src}
                alt=""
                onError={() => setImgError(true)}
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        );
    }

    if (id === 'stock-prices' || id === 'stocks') {
        return (
            <svg viewBox="0 0 64 48" width="100%" height="100%" fill="none">
                <rect width="64" height="48" rx="6" fill="#f8fafc" />
                <path d="M8 36 L22 28 L36 32 L56 12" stroke="#22A048" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 24 L22 18 L36 24 L56 8" stroke="#1B75BB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="56" cy="12" r="2.5" fill="#22A048" />
                <circle cx="56" cy="8" r="2.5" fill="#1B75BB" />
            </svg>
        );
    }
    if (id === 'gas-prices' || id === 'gas') {
        return (
            <svg viewBox="0 0 64 48" width="100%" height="100%" fill="none">
                <rect width="64" height="48" rx="6" fill="#f8fafc" />
                <path d="M8 38 L20 28 L32 34 L44 18 L56 22" stroke="#1B75BB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="56" cy="22" r="2.5" fill="#1B75BB" />
            </svg>
        );
    }
    if (id === 'global-energy' || id === 'energy') {
        return (
            <svg viewBox="0 0 64 48" width="100%" height="100%" fill="none">
                <rect width="64" height="48" rx="6" fill="#f8fafc" />
                <path d="M8 40 L18 32 L30 28 L42 16 L56 12 L56 42 L8 42 Z" fill="#fed7aa" opacity="0.6" />
                <path d="M8 40 L18 32 L30 28 L42 16 L56 12" stroke="#F47920" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="56" cy="12" r="2.5" fill="#F47920" />
            </svg>
        );
    }
    // Default Movies / Bar chart
    return (
        <svg viewBox="0 0 64 48" width="100%" height="100%" fill="none">
            <rect width="64" height="48" rx="6" fill="#f8fafc" />
            <rect x="12" y="24" width="6" height="18" rx="1.5" fill="#1B75BB" />
            <rect x="22" y="14" width="6" height="28" rx="1.5" fill="#2563eb" />
            <rect x="32" y="20" width="6" height="22" rx="1.5" fill="#F47920" />
            <rect x="42" y="10" width="6" height="32" rx="1.5" fill="#1B75BB" />
        </svg>
    );
};

// Session card component for displaying example sessions
export const ExampleSessionCard: React.FC<{
    session: ExampleSession;
    onClick: () => void;
    disabled?: boolean;
}> = ({ session, onClick, disabled }) => {
    return (
        <Card
            variant="outlined"
            sx={{
                textAlign: 'left',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: '14px',
                bgcolor: '#ffffff',
                borderColor: '#eef2f6',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': disabled ? {} : {
                    transform: 'translateY(-2px)',
                    borderColor: '#93c5fd',
                    boxShadow: '0 8px 20px rgba(27, 117, 187, 0.08)',
                    '& .df-demo-arrow': {
                        color: '#1B75BB',
                        transform: 'translateX(2px)',
                    },
                },
            }}
            onClick={disabled ? undefined : onClick}
        >
            <Box
                sx={{
                    width: 58,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#fafcff',
                }}
            >
                <DemoChartThumbnail id={session.id} src={session.previewImage} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.2,
                        mb: 0.3,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    noWrap
                >
                    {session.live && <StreamIcon sx={{ fontSize: 12, color: 'success.main', mr: 0.5 }} />}
                    {session.title}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '11.5px',
                        color: '#64748b',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.35,
                    }}
                >
                    {session.description}
                </Typography>
            </Box>

            <ChevronRightRoundedIcon
                className="df-demo-arrow"
                sx={{
                    fontSize: 18,
                    color: '#94a3b8',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                }}
            />
        </Card>
    );
};
