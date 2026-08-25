// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    CircularProgress,
    Avatar,
    Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import MicIcon from '@mui/icons-material/Mic';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { ChatMessage } from './intelligenceTypes';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    loading: boolean;
    loadingText?: string;
    variant?: 'central' | 'floating';
    onClose?: () => void;
    placeholder?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSendMessage,
    loading,
    loadingText = 'Analyst Assistant thinking...',
    variant = 'central',
    onClose,
    placeholder = 'Ask anything or describe your dashboard (e.g. "Show top 5 departments by spend")...',
}) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (variant === 'floating') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, variant]);

    // Voice recognition handler
    const handleVoiceToggle = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech recognition is not supported in this browser.');
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onresult = (event: any) => {
                const transcript = event.results?.[0]?.[0]?.transcript;
                if (transcript) {
                    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
                }
                setIsListening(false);
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
            recognition.start();
            setIsListening(true);
        } catch (err) {
            setIsListening(false);
        }
    };

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;
        onSendMessage(trimmed);
        setInput('');
    };

    // 1. Centralized Prompt Mode (Matches Landing Page Input Box Styling)
    if (variant === 'central') {
        return (
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    maxWidth: 780,
                    mx: 'auto',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    '&:focus-within': {
                        borderColor: '#1B75BB',
                        boxShadow: '0 8px 26px rgba(27, 117, 187, 0.12)',
                    },
                }}
            >
                {/* Top row: Sparkle Badge + Textarea input */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, width: '100%' }}>
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '10px',
                            bgcolor: '#f0f7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mt: 0.2,
                        }}
                    >
                        <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: '#1B75BB' }} />
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={3}
                        variant="standard"
                        placeholder={placeholder}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={loading}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                fontSize: '13.5px',
                                color: '#0f172a',
                                lineHeight: 1.5,
                            },
                        }}
                    />
                </Box>

                {/* Bottom toolbar: Voice input on the left/right & Send button */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pt: 0.5,
                        borderTop: '1px solid #f8fafc',
                    }}
                >
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px', pl: 0.5 }}>
                        Press Enter to generate
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Voice Input Button */}
                        <Tooltip title={isListening ? 'Listening... click to stop' : 'Voice input'}>
                            <IconButton
                                size="small"
                                onClick={handleVoiceToggle}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    color: isListening ? '#ef4444' : '#64748b',
                                    bgcolor: isListening ? '#fee2e2' : 'transparent',
                                    animation: isListening ? 'pulse 1.5s infinite' : 'none',
                                    '@keyframes pulse': {
                                        '0%': { transform: 'scale(1)', opacity: 1 },
                                        '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                                        '100%': { transform: 'scale(1)', opacity: 1 },
                                    },
                                    '&:hover': {
                                        bgcolor: isListening ? '#fecaca' : '#f1f5f9',
                                        color: isListening ? '#dc2626' : '#1B75BB',
                                    },
                                }}
                            >
                                {isListening ? <MicIcon sx={{ fontSize: 18 }} /> : <MicNoneOutlinedIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                        </Tooltip>

                        {/* Send Button */}
                        <IconButton
                            color="primary"
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: '#1B75BB',
                                color: '#ffffff',
                                borderRadius: '8px',
                                '&:hover': { bgcolor: '#145d97' },
                                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                            ) : (
                                <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                            )}
                        </IconButton>
                    </Box>
                </Box>
            </Paper>
        );
    }

    // 2. Floating Assistant Window (Post-Generation Dashboard Refinement)
    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                width: { xs: 'calc(100vw - 32px)', sm: 390 },
                height: 500,
                maxHeight: 'calc(100vh - 120px)',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                bgcolor: '#ffffff',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 29, 82, 0.18)',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                '@keyframes slideUp': {
                    from: { opacity: 0, transform: 'translateY(16px) scale(0.98)' },
                    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 1.5,
                    px: 2,
                    borderBottom: '1px solid #e2e8f0',
                    bgcolor: '#001d52',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#1B75BB' }}>
                        <SmartToyOutlinedIcon sx={{ fontSize: 16, color: '#ffffff' }} />
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.2 }}>
                            AI Assistant
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#93c5fd', fontSize: '10.5px' }}>
                            Refine & Modify Dashboard
                        </Typography>
                    </Box>
                </Box>
                {onClose && (
                    <IconButton size="small" onClick={onClose} sx={{ color: '#cbd5e1', '&:hover': { color: '#ffffff' } }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Messages Scroll Area */}
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#f8fafc' }}>
                {messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', my: 'auto', p: 2 }}>
                        <AutoAwesomeRoundedIcon sx={{ color: '#1B75BB', fontSize: 30, mb: 1 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0f172a', mb: 0.5 }}>
                            How can I refine your dashboard?
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 280, mx: 'auto' }}>
                            Ask to change chart types, swap KPI aggregations, add filters, or modify metrics.
                        </Typography>
                    </Box>
                ) : (
                    messages.map((msg) => {
                        const isUser = msg.role === 'user';
                        return (
                            <Box
                                key={msg.id}
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                                    maxWidth: '88%',
                                }}
                            >
                                {!isUser && (
                                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#1B75BB', mt: 0.3 }}>
                                        <SmartToyOutlinedIcon sx={{ fontSize: 14 }} />
                                    </Avatar>
                                )}
                                <Box
                                    sx={{
                                        p: 1.2,
                                        px: 1.6,
                                        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                        bgcolor: isUser ? '#001d52' : '#ffffff',
                                        color: isUser ? '#ffffff' : '#1e293b',
                                        fontSize: '12.5px',
                                        lineHeight: 1.45,
                                        border: isUser ? 'none' : '1px solid #e2e8f0',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontSize: '12.5px' }}>
                                        {msg.content}
                                    </Typography>
                                </Box>
                                {isUser && (
                                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#475569', mt: 0.3 }}>
                                        <PersonOutlineIcon sx={{ fontSize: 14 }} />
                                    </Avatar>
                                )}
                            </Box>
                        );
                    })
                )}

                {loading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', p: 1, bgcolor: '#ffffff', borderRadius: '8px', width: 'fit-content' }}>
                        <CircularProgress size={14} sx={{ color: '#1B75BB' }} />
                        <Typography variant="caption" sx={{ fontStyle: 'italic', fontSize: '11.5px' }}>
                            {loadingText}
                        </Typography>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Bar with Voice Support */}
            <Box sx={{ p: 1.2, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: '#ffffff' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Type changes (e.g. 'Change KPI 2 to Avg')..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            fontSize: '12.5px',
                        },
                    }}
                />

                <Tooltip title={isListening ? 'Listening...' : 'Voice input'}>
                    <IconButton
                        size="small"
                        onClick={handleVoiceToggle}
                        sx={{
                            color: isListening ? '#ef4444' : '#64748b',
                            bgcolor: isListening ? '#fee2e2' : 'transparent',
                        }}
                    >
                        {isListening ? <MicIcon sx={{ fontSize: 18 }} /> : <MicNoneOutlinedIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                </Tooltip>

                <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    sx={{
                        bgcolor: '#1B75BB',
                        color: '#ffffff',
                        borderRadius: '8px',
                        flexShrink: 0,
                        '&:hover': { bgcolor: '#145d97' },
                        '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                    }}
                >
                    <SendIcon fontSize="small" />
                </IconButton>
            </Box>
        </Paper>
    );
};
