// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState } from 'react';
import {
    Box,
    Alert,
    AlertTitle,
    Typography,
    Button,
    Collapse,
} from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';

export interface UserFriendlyError {
    title: string;
    reason: string;
    suggestion: string;
    category: 'auth' | 'rate_limit' | 'context' | 'network' | 'database' | 'schema' | 'timeout' | 'general';
    rawMessage: string;
}

/**
 * Translates raw backend, network, DuckDB, or LiteLLM errors into clear,
 * justified, and actionable user-facing messages.
 */
export function parseUserFriendlyError(rawError: any): UserFriendlyError {
    const rawMsg = (
        typeof rawError === 'string'
            ? rawError
            : rawError?.message || rawError?.detail || rawError?.apiError?.message || JSON.stringify(rawError || '')
    ).trim();

    const lower = rawMsg.toLowerCase();

    // 1. Authentication & API Key Errors
    if (
        lower.includes('api key not valid') ||
        lower.includes('authenticationerror') ||
        lower.includes('invalid_api_key') ||
        lower.includes('auth_required') ||
        lower.includes('access_denied') ||
        lower.includes('unauthorized') ||
        lower.includes('401') ||
        lower.includes('forbidden')
    ) {
        return {
            title: 'AI Model Authentication Required',
            reason: 'The selected AI model provider rejected the request because the API key is missing, invalid, or expired.',
            suggestion: 'Go to Settings → AI Models to verify and update your API key, or switch to an active model.',
            category: 'auth',
            rawMessage: rawMsg,
        };
    }

    // 2. Rate Limits & Quota Exhaustion
    if (
        lower.includes('ratelimiterror') ||
        lower.includes('429') ||
        lower.includes('resource has been exhausted') ||
        lower.includes('quota') ||
        lower.includes('rate limit') ||
        lower.includes('too many requests')
    ) {
        return {
            title: 'AI Provider Rate Limit Reached',
            reason: 'The AI model provider is temporarily throttling requests due to high traffic or account rate limits.',
            suggestion: 'Please wait 10–20 seconds and click Retry, or select a different model in Settings.',
            category: 'rate_limit',
            rawMessage: rawMsg,
        };
    }

    // 3. Context Length / Token Overflow
    if (
        lower.includes('context_length_exceeded') ||
        lower.includes('maximum context length') ||
        lower.includes('token limit') ||
        lower.includes('prompt too long') ||
        lower.includes('tokens exceeds')
    ) {
        return {
            title: 'Dataset Exceeds AI Context Window',
            reason: 'The combined table schema, sample data, and prompt exceed the maximum token capacity for this AI model.',
            suggestion: 'Try selecting 1 to 3 core tables instead of the entire database, or use a model with a larger context window.',
            category: 'context',
            rawMessage: rawMsg,
        };
    }

    // 4. Network & Server Connectivity
    if (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('econnrefused') ||
        lower.includes('connection refused') ||
        lower.includes('502') ||
        lower.includes('503') ||
        lower.includes('504')
    ) {
        return {
            title: 'Backend Server Disconnected',
            reason: 'The application is unable to communicate with the InsightCanvas backend service.',
            suggestion: 'Ensure the backend server is running (port 5567) and verify your network connection.',
            category: 'network',
            rawMessage: rawMsg,
        };
    }

    // 5. Database Connection & Remote Server
    if (
        lower.includes('mysql server has gone away') ||
        lower.includes('connection timed out') ||
        lower.includes('cant connect to') ||
        lower.includes("can't connect to") ||
        lower.includes('database is locked') ||
        lower.includes('access denied for user')
    ) {
        return {
            title: 'Data Source Connection Error',
            reason: 'The remote database closed the connection, timed out, or denied access to the selected catalog.',
            suggestion: 'Verify that your database server is running, check connection credentials in Data Sources, and try again.',
            category: 'database',
            rawMessage: rawMsg,
        };
    }

    // 6. SQL / DuckDB Schema & Binder Errors
    if (
        lower.includes('binder error') ||
        lower.includes('does not exist') ||
        lower.includes('not found in from clause') ||
        lower.includes('conversion error') ||
        lower.includes('table with name')
    ) {
        return {
            title: 'Data Schema / Table Error',
            reason: 'A requested table or column is missing or has an incompatible data structure in DuckDB.',
            suggestion: 'Try re-ingesting the table from the Data Sources menu or choose a different table for analysis.',
            category: 'schema',
            rawMessage: rawMsg,
        };
    }

    // 7. Request Timeout
    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline exceeded')) {
        return {
            title: 'Request Timed Out',
            reason: 'The operation took too long to complete, likely due to heavy table volume or slow response from the AI provider.',
            suggestion: 'Click Retry or try profiling fewer tables to speed up query analysis.',
            category: 'timeout',
            rawMessage: rawMsg,
        };
    }

    // 8. General Fallback
    return {
        title: 'Operation Encountered an Issue',
        reason: rawMsg.length > 200 ? `${rawMsg.slice(0, 197)}...` : rawMsg,
        suggestion: 'Please verify your data source selection and retry, or review the technical details below.',
        category: 'general',
        rawMessage: rawMsg,
    };
}

interface IntelligenceErrorAlertProps {
    error: any;
    onDismiss?: () => void;
    onRetry?: () => void;
    sx?: any;
}

/**
 * Polished, user-friendly error banner for BI HUB displaying
 * clear explanation, actionable resolution, and collapsible technical logs.
 */
export const IntelligenceErrorAlert: React.FC<IntelligenceErrorAlertProps> = ({
    error,
    onDismiss,
    onRetry,
    sx = {},
}) => {
    const [showDetails, setShowDetails] = useState<boolean>(false);

    if (!error) return null;

    const parsed = parseUserFriendlyError(error);

    return (
        <Alert
            severity="error"
            onClose={onDismiss}
            action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {onRetry && (
                        <Button
                            color="inherit"
                            size="small"
                            onClick={onRetry}
                            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                fontWeight: 700,
                                fontSize: '12px',
                                textTransform: 'none',
                                bgcolor: 'rgba(239, 68, 68, 0.08)',
                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.16)' },
                                px: 1.5,
                                py: 0.3,
                                borderRadius: '6px',
                            }}
                        >
                            Retry
                        </Button>
                    )}
                </Box>
            }
            sx={{
                mb: 2,
                borderRadius: '12px',
                border: '1px solid #fecaca',
                bgcolor: '#fff5f5',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)',
                '& .MuiAlert-icon': {
                    color: '#ef4444',
                    mt: 0.2,
                },
                ...sx,
            }}
        >
            <AlertTitle sx={{ fontWeight: 800, fontSize: '13.5px', color: '#991b1b', mb: 0.5 }}>
                {parsed.title}
            </AlertTitle>

            <Typography variant="body2" sx={{ fontSize: '12.5px', color: '#7f1d1d', lineHeight: 1.5, mb: 1 }}>
                {parsed.reason}
            </Typography>

            {/* Actionable Suggestion Box */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.8,
                    p: 1.2,
                    bgcolor: 'rgba(255, 255, 255, 0.85)',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2',
                    mb: 0.5,
                }}
            >
                <LightbulbOutlinedIcon sx={{ fontSize: 16, color: '#d97706', mt: 0.2, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ fontSize: '11.5px', color: '#92400e', fontWeight: 600, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 800 }}>Suggestion: </span>
                    {parsed.suggestion}
                </Typography>
            </Box>

            {/* Collapsible Technical Details */}
            {parsed.rawMessage && parsed.rawMessage !== parsed.reason && (
                <Box sx={{ mt: 1 }}>
                    <Button
                        size="small"
                        onClick={() => setShowDetails((prev) => !prev)}
                        endIcon={showDetails ? <KeyboardArrowUpIcon sx={{ fontSize: 14 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
                        startIcon={<CodeOutlinedIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            color: '#991b1b',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'none',
                            p: 0,
                            minWidth: 'auto',
                            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                        }}
                    >
                        {showDetails ? 'Hide technical details' : 'View technical details'}
                    </Button>

                    <Collapse in={showDetails}>
                        <Box
                            component="pre"
                            sx={{
                                mt: 0.8,
                                p: 1.2,
                                bgcolor: '#1e293b',
                                color: '#f8fafc',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontFamily: 'monospace',
                                overflowX: 'auto',
                                maxHeight: 160,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                border: '1px solid #334155',
                            }}
                        >
                            {parsed.rawMessage}
                        </Box>
                    </Collapse>
                </Box>
            )}
        </Alert>
    );
};
