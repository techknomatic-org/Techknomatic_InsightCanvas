// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.
//
// Shared chat-style input box for agent surfaces. Renders a rounded
// border with focus glow, an inline image-preview row, a file-attach
// affordance, a multiline `InputBase`, and a send/stop button. Used by
// both the in-chat `DataLoadingChat` and the landing-page Data Loading
// Agent quick-start box so they look and behave identically (paste
// image, drag attach, Shift+Enter, etc.).

import * as React from 'react';
import { useRef, useState } from 'react';
import {
    Box,
    IconButton,
    InputBase,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import MicNoneRoundedIcon from '@mui/icons-material/MicNoneRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import StopIcon from '@mui/icons-material/Stop';
import { useTranslation } from 'react-i18next';
import { borderColor, transition, radius } from '../app/tokens';
import { iconVar, textVar } from '../app/layout';

export interface AgentChatInputProps {
    value: string;
    onChange: (v: string) => void;
    images: string[];
    onImagesChange: React.Dispatch<React.SetStateAction<string[]>>;
    onSend: () => void;
    onStop?: () => void;
    inProgress?: boolean;
    disabled?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
    showSparkleBadge?: boolean;
    showVoiceButton?: boolean;
    /**
     * What `<input type="file">` accepts. Defaults to images + common
     * tabular text files.
     */
    fileAccept?: string;
    /**
     * Called when the user attaches a non-image file. If omitted,
     * non-image files are silently ignored (image-only mode).
     */
    onNonImageFile?: (file: File) => void;
    /**
     * Optional list of attached non-image files (e.g. uploaded Excel/CSV).
     * Rendered as removable chips above the input — mirrors the
     * image-preview row. The parent owns the array and handles
     * upload/removal side effects (e.g. stripping the matching
     * `[Uploaded: name]` mention from the prompt).
     */
    attachments?: string[];
    onAttachmentsChange?: (names: string[]) => void;
    sendTooltip?: string;
    stopTooltip?: string;
    attachTooltip?: string;
    inputRef?: React.Ref<HTMLTextAreaElement>;
    /** Min visible rows for the text area. Defaults to 1. */
    minRows?: number;
    /** Max visible rows for the text area. Defaults to 8. */
    maxRows?: number;
    /**
     * Optional leading slot rendered to the left of the attach button —
     * used by surfaces (e.g. landing page) that want a branded icon
     * instead of, or in addition to, the attach affordance.
     */
    leadingSlot?: React.ReactNode;
    /**
     * If false, the attach button is hidden (paste of images still works).
     */
    showAttachButton?: boolean;
    /**
     * Layout style.
     *  - 'inline'  (default): leading slot, attach, input, send share a single row.
     *  - 'stacked': input occupies its own row; the leading slot + attach button
     *               sit in a bottom-left toolbar, send button in bottom-right.
     *               Recommended when `minRows > 1`.
     */
    layout?: 'inline' | 'stacked';
    /**
     * Optional content rendered above the input (e.g. a chip bar of
     * available data sources). Only used in `'stacked'` layout.
     */
    topSlot?: React.ReactNode;
    /**
     * When set and the input is empty, pressing Tab fills the input
     * with this string (acts as an accept-suggestion shortcut).
     */
    tabSuggestion?: string;
    /**
     * When provided and the input is focused & empty, surfaces these
     * prompts as a Google-style overlay dropdown below the input.
     * Each item's `onClick` is invoked when the user picks it — the
     * caller is responsible for filling text / attaching images so
     * suggestions can hand off arbitrary state (e.g. a sample image
     * plus a long prompt). Does not push surrounding content.
     */
    focusSuggestions?: Array<{ label: string; onClick: () => void; kind?: string; icon?: React.ReactNode }>;
    /**
     * Optional header label shown above the focus-suggestion list.
     * Defaults to "Try asking".
     */
    focusSuggestionsLabel?: string;
    /**
     * Where to anchor the focus-suggestion overlay relative to the input.
     *  - 'bottom' (default): drops down below the input.
     *  - 'top': pops up above the input. Use when the input is pinned to
     *    the bottom of its container and downward overlays would clip.
     */
    focusSuggestionsPlacement?: 'top' | 'bottom';
    sx?: any;
}

export const AgentChatInput: React.FC<AgentChatInputProps> = ({
    value,
    onChange,
    images,
    onImagesChange,
    onSend,
    onStop,
    inProgress = false,
    disabled = false,
    placeholder,
    autoFocus = false,
    showSparkleBadge = true,
    showVoiceButton = true,
    fileAccept = 'image/*,.csv,.json,.xlsx,.xls,.txt,.tsv',
    onNonImageFile,
    attachments,
    onAttachmentsChange,
    sendTooltip,
    stopTooltip,
    attachTooltip,
    inputRef,
    minRows,
    maxRows = 8,
    leadingSlot,
    showAttachButton = true,
    layout = 'inline',
    topSlot,
    tabSuggestion,
    focusSuggestions,
    focusSuggestionsLabel,
    focusSuggestionsPlacement = 'bottom',
    sx,
}) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const localInputRef = useRef<HTMLTextAreaElement>(null);
    const actualInputRef = (inputRef as React.RefObject<HTMLTextAreaElement>) || localInputRef;
    const [focused, setFocused] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const showFocusSuggestions = focused
        && value.length === 0
        && !!focusSuggestions
        && focusSuggestions.length > 0;

    React.useEffect(() => {
        if (autoFocus) actualInputRef.current?.focus();
         
    }, []);

    const handleVoiceToggle = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
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
                    onChange(value ? `${value} ${transcript}` : transcript);
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

    const canSend = (value.trim().length > 0 || images.length > 0) && !inProgress && !disabled;

    // Shared file intake: images become inline previews, everything else is
    // handed to `onNonImageFile` (scratch upload → attachment chip). Used by
    // paste, the + attach button, and drag-and-drop so all three behave the
    // same.
    const processFiles = (files: File[]) => {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.result) onImagesChange(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            } else if (onNonImageFile) {
                onNonImageFile(file);
            }
        });
    };

    const [isDragActive, setIsDragActive] = useState(false);

    const dragHasFiles = (e: React.DragEvent) =>
        Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const handleDragOver = (e: React.DragEvent) => {
        if (!dragHasFiles(e) || inProgress || disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragEnter = (e: React.DragEvent) => {
        if (!dragHasFiles(e) || inProgress || disabled) return;
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Ignore leaves that bubble up from child elements.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!dragHasFiles(e) || inProgress || disabled) return;
        e.preventDefault();
        setIsDragActive(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) processFiles(Array.from(files));
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        if (e.clipboardData?.files?.length) {
            const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                e.preventDefault();
                imageFiles.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (reader.result) onImagesChange(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFiles([file]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
            return;
        }
        if (e.key === 'Tab' && !e.shiftKey && tabSuggestion && value.length === 0) {
            e.preventDefault();
            onChange(tabSuggestion);
        }
    };

    const attachButton = showAttachButton ? (
        <Tooltip title={attachTooltip ?? t('dataLoading.attachTooltip', { defaultValue: 'Attach file' })} placement="top">
            <IconButton size="small" onClick={() => fileInputRef.current?.click()}
                disabled={inProgress || disabled}
                sx={{
                    color: '#475569',
                    p: 0.5,
                    '&:hover': {
                        color: '#1e293b',
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                    },
                }}>
                <AddIcon sx={{ fontSize: 22 }} />
            </IconButton>
        </Tooltip>
    ) : null;

    const voiceButton = showVoiceButton ? (
        <Tooltip title={isListening ? t('dataLoading.stopVoice', { defaultValue: 'Listening... Click to stop' }) : t('dataLoading.voiceInput', { defaultValue: 'Voice input' })} placement="top">
            <IconButton
                size="small"
                onClick={handleVoiceToggle}
                disabled={inProgress || disabled}
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    bgcolor: isListening ? '#ede9fe' : '#ffffff',
                    color: '#4f46e5',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                        bgcolor: '#f8fafc',
                        borderColor: '#cbd5e1',
                    },
                }}
            >
                <MicNoneRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
        </Tooltip>
    ) : null;

    const sendButton = inProgress && onStop ? (
        <Tooltip title={stopTooltip ?? t('dataLoading.stopTooltip')} placement="top">
            <IconButton size="small" onClick={onStop}
                sx={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                    color: 'error.main',
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.16),
                        color: 'error.dark',
                        borderColor: alpha(theme.palette.error.main, 0.35),
                    },
                }}>
                <StopIcon sx={{ fontSize: iconVar.sm }} />
            </IconButton>
        </Tooltip>
    ) : (
        <Tooltip title={sendTooltip ?? t('dataLoading.sendTooltip')} placement="top">
            <span>
                <IconButton size="small" onClick={onSend} disabled={!canSend}
                    aria-label={sendTooltip ?? t('dataLoading.sendTooltip')}
                    sx={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        background: canSend
                            ? 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 50%, #7c3aed 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 50%, #7c3aed 100%)',
                        color: '#ffffff',
                        boxShadow: canSend ? '0 3px 10px rgba(79, 70, 229, 0.35)' : 'none',
                        transition: 'all 0.2s ease',
                        opacity: canSend ? 1 : 0.85,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6d28d9 100%)',
                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.45)',
                            transform: 'scale(1.04)',
                        },
                        '&.Mui-disabled': {
                            background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a78bfa 100%)',
                            color: '#ffffff',
                            opacity: 0.7,
                        },
                    }}>
                    <ArrowUpwardRoundedIcon sx={{ fontSize: 20, fontWeight: 700 }} />
                </IconButton>
            </span>
        </Tooltip>
    );

    const hiddenFileInput = (
        <input type="file" ref={fileInputRef} style={{ display: 'none' }}
            accept={fileAccept}
            onChange={handleFileUpload} />
    );

    const inputField = (
        <InputBase
            inputRef={actualInputRef}
            multiline
            minRows={minRows || (layout === 'stacked' ? 2 : 1)}
            maxRows={maxRows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setFocused(true)}
            // Delay blur so a mousedown on a suggestion can fire first.
            // Suggestion items also call preventDefault on mousedown, so
            // in practice the textarea stays focused while we fill it.
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder={placeholder}
            disabled={inProgress || disabled}
            sx={{
                flex: 1,
                width: '100%',
                px: 0.5,
                py: 0.25,
                fontSize: '14.5px',
                lineHeight: 1.5,
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                color: '#1e293b',
                alignItems: 'flex-start',
                '& .MuiInputBase-input': {
                    width: '100%',
                    '&::placeholder': {
                        color: '#64748b',
                        opacity: 1,
                    },
                },
            }}
        />
    );


    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                sx={{
                    position: 'relative',
                    border: '1px solid rgba(226, 232, 240, 0.9)',
                    borderRadius: '24px',
                    bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
                    transition: transition.fast,
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3.5px',
                        background: 'linear-gradient(90deg, #00d2ff 0%, #3b82f6 28%, #8b5cf6 68%, #e040fb 100%)',
                        zIndex: 1,
                    },
                    '&:hover': {
                        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03)',
                        borderColor: '#cbd5e1',
                    },
                    '&:focus-within': {
                        borderColor: '#93c5fd',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.12), 0 12px 36px rgba(0, 0, 0, 0.06)',
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    ...sx,
                }}
            >
                {/* Drag-and-drop overlay */}
                {isDragActive && (
                    <Box sx={{
                        position: 'absolute',
                        inset: 4,
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        pointerEvents: 'none',
                        border: `2px dashed ${theme.palette.primary.main}`,
                        borderRadius: '20px',
                        bgcolor: theme.palette.background.paper,
                        backgroundImage: `linear-gradient(${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.08)})`,
                        transition: transition.normal,
                    }}>
                        <UploadFileIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                            {t('dataLoading.dropToAttach', { defaultValue: 'Drop file to attach' })}
                        </Typography>
                    </Box>
                )}
                {/* Top slot (e.g. data-source chip bar) */}
                {topSlot && (
                    <Box sx={{ px: 2, pt: 1.5, pb: 0.25 }}>
                        {topSlot}
                    </Box>
                )}

                {/* Image previews */}
                {images.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.75, px: 2.5, pt: 1.5, pb: 0, flexWrap: 'wrap' }}>
                        {images.map((img, i) => (
                            <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                                <Box component="img" src={img}
                                    sx={{
                                        width: 56, height: 56, objectFit: 'cover',
                                        borderRadius: 1, border: `1px solid ${borderColor.component}`,
                                    }} />
                                <IconButton size="small"
                                    onClick={() => onImagesChange(prev => prev.filter((_, idx) => idx !== i))}
                                    sx={{
                                        position: 'absolute', top: -4, right: -4,
                                        width: 18, height: 18,
                                        bgcolor: 'rgba(0,0,0,0.55)', color: 'white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                                    }}>
                                    <CloseIcon sx={{ fontSize: iconVar.xs }} />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Attached non-image file chips (Excel, CSV, JSON, …) */}
                {attachments && attachments.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, px: 2.5, pt: 1.5, pb: 0, flexWrap: 'wrap' }}>
                        {attachments.map((name, i) => (
                            <Box key={`${name}-${i}`} sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                pl: 0.75, pr: 0.25, py: 0.25,
                                color: 'text.secondary',
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                border: `1px solid ${borderColor.divider}`,
                                borderRadius: 1,
                                maxWidth: 220,
                            }}>
                                <InsertDriveFileOutlinedIcon sx={{ fontSize: iconVar.sm, color: 'text.disabled', flexShrink: 0 }} />
                                <Typography
                                    variant="caption"
                                    title={name}
                                    sx={{
                                        fontSize: textVar.xs, lineHeight: 1.4,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}
                                >
                                    {name}
                                </Typography>
                                {onAttachmentsChange && (
                                    <IconButton size="small"
                                        onClick={() => onAttachmentsChange(attachments.filter((_, idx) => idx !== i))}
                                        sx={{ width: 16, height: 16, p: 0, color: 'text.disabled',
                                            '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) } }}>
                                        <CloseIcon sx={{ fontSize: textVar.xs }} />
                                    </IconButton>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {hiddenFileInput}

                {layout === 'stacked' ? (
                    <Box sx={{ p: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {/* Top row: Sparkle Badge + Input field */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                            {showSparkleBadge && (
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '12px',
                                        bgcolor: '#f1effd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        mt: 0.25,
                                    }}
                                >
                                    <AutoAwesomeRoundedIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                                </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
                                {inputField}
                            </Box>
                        </Box>

                        {/* Bottom toolbar: Attach/plus on the left, Voice & Send on the right */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            pt: 0.5,
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {attachButton}
                                {leadingSlot}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {voiceButton}
                                {sendButton}
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    /* Inline layout: everything on a single row. */
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, gap: 1 }}>
                        {showSparkleBadge && (
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '10px',
                                    bgcolor: '#f1effd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: '#6366f1' }} />
                            </Box>
                        )}
                        {leadingSlot}
                        {inputField}
                        {showAttachButton && attachButton}
                        {voiceButton}
                        {sendButton}
                    </Box>
                )}
            </Box>

            {/* Google-style suggestion overlay. Anchored to the outer
                relative wrapper so it overlays content below instead of
                pushing layout. */}
            {showFocusSuggestions && (
                <Box
                    sx={{
                        position: 'absolute',
                        ...(focusSuggestionsPlacement === 'top'
                            ? { bottom: 'calc(100% + 4px)' }
                            : { top: 'calc(100% + 4px)' }),
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        borderRadius: '12px',
                        border: `1px solid ${borderColor.divider}`,
                        bgcolor: theme.palette.background.paper,
                        boxShadow: '0 4px 16px rgba(32, 33, 36, 0.16), 0 2px 6px rgba(32, 33, 36, 0.08)',
                        py: 0.5,
                        overflow: 'hidden',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            px: 1.5,
                            py: 0.5,
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            letterSpacing: '0.02em',
                        }}
                    >
                        {focusSuggestionsLabel ?? 'Try asking'}
                    </Typography>
                    {focusSuggestions!.map((s, i) => (
                        <Box
                            key={i}
                            onMouseDown={(e) => {
                                // Prevent the textarea from blurring so the
                                // overlay doesn't disappear mid-click.
                                e.preventDefault();
                                s.onClick();
                                actualInputRef.current?.focus();
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1.5,
                                py: 0.5,
                                cursor: 'pointer',
                                color: 'text.primary',
                                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                            }}
                        >
                            {s.icon ? (
                                <Box
                                    aria-hidden
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 16, flexShrink: 0,
                                        color: 'text.secondary',
                                    }}
                                >
                                    {s.icon}
                                </Box>
                            ) : null}
                            <Typography
                                variant="body2"
                                sx={{
                                    flex: 1, minWidth: 0,
                                    fontSize: textVar.lg,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'inherit',
                                    ...(s.icon ? {} : {
                                        '&::before': {
                                            content: '"–"',
                                            display: 'inline-block',
                                            width: '1em',
                                            color: 'text.disabled',
                                        },
                                    }),
                                }}
                            >
                                {s.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};
