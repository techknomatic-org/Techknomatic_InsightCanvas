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
    Button,
    Grow,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import MicIcon from '@mui/icons-material/Mic';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import KeyboardReturnOutlinedIcon from '@mui/icons-material/KeyboardReturnOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { ChatMessage } from './intelligenceTypes';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    loading: boolean;
    loadingText?: string;
    variant?: 'central' | 'floating';
    onClose?: () => void;
    placeholder?: string;
    error?: string | null;
    onClearError?: () => void;
    onChangeTables?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSendMessage,
    loading,
    loadingText = 'Analyst Assistant thinking...',
    variant = 'central',
    onClose,
    placeholder = 'Ask anything or describe your dashboard (e.g. "Show top 5 departments by spend")...',
    error,
    onClearError,
    onChangeTables,
}) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // 1. Centralized Prompt Mode (Matches Landing Page Input Box Styling with Gorgeous Accent Bar)
    if (variant === 'central') {
        const hasInput = Boolean(input.trim());

        return (
            <Box sx={{ width: '100%', maxWidth: 780, mx: 'auto', position: 'relative' }}>
                {/* User-Friendly Floating Error / Guidance Popup */}
                {error && (
                    <Grow in={Boolean(error)} timeout={280}>
                        <Paper
                            elevation={0}
                            sx={{
                                width: '100%',
                                mb: 1.8,
                                p: 2,
                                px: 2.2,
                                borderRadius: '14px',
                                border: '1.5px solid #fca5a5',
                                background: 'linear-gradient(135deg, #fffafa 0%, #fef2f2 100%)',
                                boxShadow: '0 12px 32px rgba(239, 68, 68, 0.13), 0 2px 8px rgba(0, 0, 0, 0.04)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.5,
                                animation: 'shake 0.4s ease-in-out',
                                '@keyframes shake': {
                                    '0%, 100%': { transform: 'translateX(0)' },
                                    '20%, 60%': { transform: 'translateX(-4px)' },
                                    '40%, 80%': { transform: 'translateX(4px)' },
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: '#fee2e2',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    mt: 0.1,
                                }}
                            >
                                <WarningAmberRoundedIcon sx={{ fontSize: 20 }} />
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.4 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b', fontSize: '13.5px' }}>
                                        Dataset & Topic Mismatch
                                    </Typography>
                                    {onClearError && (
                                        <IconButton size="small" onClick={onClearError} sx={{ color: '#991b1b', p: 0.3 }}>
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    )}
                                </Box>

                                <Typography variant="body2" sx={{ color: '#7f1d1d', fontSize: '12px', lineHeight: 1.55, mb: 1.4 }}>
                                    {error}
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    {onChangeTables && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<TableChartOutlinedIcon sx={{ fontSize: 15 }} />}
                                            onClick={onChangeTables}
                                            sx={{
                                                textTransform: 'none',
                                                fontSize: '11.5px',
                                                fontWeight: 600,
                                                color: '#991b1b',
                                                borderColor: '#fca5a5',
                                                borderRadius: '7px',
                                                py: 0.4,
                                                px: 1.3,
                                                bgcolor: '#ffffff',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                '&:hover': {
                                                    bgcolor: '#fef2f2',
                                                    borderColor: '#ef4444',
                                                },
                                            }}
                                        >
                                            Change Selected Tables
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => {
                                            if (onClearError) onClearError();
                                            inputRef.current?.focus();
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            fontSize: '11.5px',
                                            fontWeight: 600,
                                            color: '#64748b',
                                            borderRadius: '7px',
                                            py: 0.4,
                                            px: 1,
                                            '&:hover': { color: '#0f172a', bgcolor: 'rgba(0,0,0,0.04)' },
                                        }}
                                    >
                                        Edit Prompt
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>
                    </Grow>
                )}

                <Paper
                    elevation={0}
                    sx={{
                        width: '100%',
                        borderRadius: '16px',
                        border: error ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 4px 20px rgba(0, 29, 82, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                            borderColor: error ? '#f87171' : '#cbd5e1',
                            boxShadow: '0 6px 24px rgba(0, 29, 82, 0.08)',
                        },
                        '&:focus-within': {
                            borderColor: '#93c5fd',
                            boxShadow: '0 10px 30px rgba(27, 117, 187, 0.14), 0 0 0 3px rgba(56, 189, 248, 0.12)',
                            '& .top-accent-bar': {
                                height: '4px',
                                filter: 'brightness(1.08)',
                            },
                        },
                    }}
                >
                    {/* Sleek Gradient Accent Bar at the top */}
                    <Box
                        className="top-accent-bar"
                        sx={{
                            width: '100%',
                            height: '3.5px',
                            background: error
                                ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)'
                                : 'linear-gradient(90deg, #1B75BB 0%, #0ea5e9 35%, #6366f1 70%, #8b5cf6 100%)',
                            transition: 'height 0.2s ease, filter 0.2s ease',
                        }}
                    />

                <Box sx={{ p: 2, pt: 1.8, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    {/* Top row: Gradient Sparkle Avatar Badge + Textarea input */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(27, 117, 187, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                                border: '1px solid rgba(27, 117, 187, 0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                mt: 0.1,
                                boxShadow: '0 2px 6px rgba(27, 117, 187, 0.08)',
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
                                    fontWeight: 450,
                                },
                            }}
                        />
                    </Box>

                    {/* Bottom toolbar: Helper text on the left & Voice + Send buttons on the right */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            pt: 0.8,
                            borderTop: '1px solid #f1f5f9',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, pl: 0.5 }}>
                            <KeyboardReturnOutlinedIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>
                                Press Enter to generate
                            </Typography>
                        </Box>

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

                            {/* Send Button with Smooth Gradient & Elevation */}
                            <IconButton
                                onClick={handleSend}
                                disabled={!hasInput || loading}
                                sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '9px',
                                    background: hasInput
                                        ? 'linear-gradient(135deg, #1B75BB 0%, #4F46E5 100%)'
                                        : '#e2e8f0',
                                    color: hasInput ? '#ffffff' : '#94a3b8',
                                    boxShadow: hasInput ? '0 3px 10px rgba(27, 117, 187, 0.3)' : 'none',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        background: hasInput
                                            ? 'linear-gradient(135deg, #145d97 0%, #4338ca 100%)'
                                            : '#e2e8f0',
                                        transform: hasInput ? 'scale(1.04)' : 'none',
                                    },
                                    '&.Mui-disabled': {
                                        bgcolor: '#e2e8f0',
                                        color: '#94a3b8',
                                        boxShadow: 'none',
                                    },
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
                </Box>
            </Paper>
        </Box>
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
                width: 380,
                height: 520,
                zIndex: 1200,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
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
            {/* Top Accent Bar for Floating Window */}
            <Box
                sx={{
                    width: '100%',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1B75BB 0%, #0ea5e9 40%, #6366f1 100%)',
                }}
            />

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
                    <Avatar sx={{ width: 28, height: 28, background: 'linear-gradient(135deg, #1B75BB 0%, #4F46E5 100%)' }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: '#1B75BB' }}>
                            <SmartToyOutlinedIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Box sx={{ p: 1.2, px: 1.6, borderRadius: '14px 14px 14px 2px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={14} sx={{ color: '#1B75BB' }} />
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {loadingText}
                            </Typography>
                        </Box>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Footer */}
            <Box
                sx={{
                    p: 1.5,
                    borderTop: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Refine (e.g. 'Use donut for chart 2')..."
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
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            bgcolor: '#f8fafc',
                            '& fieldset': { borderColor: '#e2e8f0' },
                            '&:hover fieldset': { borderColor: '#cbd5e1' },
                            '&.Mui-focused fieldset': { borderColor: '#1B75BB' },
                        },
                    }}
                />

                <Tooltip title={isListening ? 'Listening...' : 'Voice'}>
                    <IconButton
                        size="small"
                        onClick={handleVoiceToggle}
                        sx={{
                            color: isListening ? '#ef4444' : '#64748b',
                            bgcolor: isListening ? '#fee2e2' : 'transparent',
                        }}
                    >
                        {isListening ? <MicIcon fontSize="small" /> : <MicNoneOutlinedIcon fontSize="small" />}
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
