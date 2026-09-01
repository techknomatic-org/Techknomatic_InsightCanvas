// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * InteractiveGuidedTour — Step-by-Step Screen Spotlight & Interactive Walkthrough
 * Highlights actual UI elements on each page, automatically navigates across routes,
 * and allows users to click and interact with real platform features.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Portal,
    alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';

export interface InteractiveGuidedTourProps {
    open: boolean;
    onClose: () => void;
    onOpenUploadDialog?: (tab?: string) => void;
}

interface TourStep {
    route: string;
    targetSelector: string;
    badge: string;
    title: string;
    description: string;
    placement?: 'bottom' | 'top' | 'right' | 'left' | 'center';
    interactiveActionLabel?: string;
    onInteractiveAction?: () => void;
    icon: React.ReactNode;
}

export const InteractiveGuidedTour: React.FC<InteractiveGuidedTourProps> = ({
    open,
    onClose,
    onOpenUploadDialog,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);

    const steps: TourStep[] = [
        {
            route: '/',
            targetSelector: '#tour-top-nav',
            badge: 'Step 1 of 4: Navigation',
            title: 'Top Navigation Bar',
            description: 'Use the top bar to switch between the Home workspace, the autonomous Intelligence Hub, About page, Settings, and this Interactive Guide.',
            placement: 'bottom',
            icon: <NavigationRoundedIcon sx={{ fontSize: 22, color: '#2563eb' }} />,
        },
        {
            route: '/',
            targetSelector: '#tour-btn-upload',
            badge: 'Step 2 of 4: Data Ingestion',
            title: 'Import Files & Connect Databases',
            description: 'Click "Upload Data" to import CSV, Excel (.xlsx), or JSON files. You can also connect to MySQL, PostgreSQL, SQL Server, and Snowflake.',
            placement: 'bottom',
            interactiveActionLabel: 'Test Opening Upload Dialog',
            onInteractiveAction: () => onOpenUploadDialog?.('upload'),
            icon: <UploadFileOutlinedIcon sx={{ fontSize: 22, color: '#059669' }} />,
        },
        {
            route: '/intelligence-hub',
            targetSelector: '#tour-hub-container',
            badge: 'Step 3 of 4: Intelligence Hub',
            title: 'Intelligence Hub & Schema Discovery',
            description: 'Welcome to the Intelligence Hub! Here you can profile relational databases, discover table schemas, and inspect foreign key relationships.',
            placement: 'bottom',
            icon: <AutoAwesomeOutlinedIcon sx={{ fontSize: 22, color: '#7c3aed' }} />,
        },
        {
            route: '/settings',
            targetSelector: '#tour-settings-container',
            badge: 'Step 4 of 4: Configuration',
            title: 'Settings & AI Model Selection',
            description: 'Configure your AI models (OpenAI, Anthropic, Ollama), customize chart palettes & row limits, and inspect live backend execution logs.',
            placement: 'bottom',
            icon: <TuneOutlinedIcon sx={{ fontSize: 22, color: '#0284c7' }} />,
        },
    ];

    const currentTourStep = steps[currentStep];

    // Navigate to the step's page if needed
    useEffect(() => {
        if (!open) return;
        const targetRoute = currentTourStep.route;
        if (location.pathname !== targetRoute) {
            setIsNavigating(true);
            navigate(targetRoute);
            const timer = setTimeout(() => {
                setIsNavigating(false);
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [open, currentStep, currentTourStep, location.pathname, navigate]);

    // Measure target element bounding box
    const updateTargetRect = useCallback(() => {
        if (!open || !currentTourStep) return;
        const el = document.querySelector(currentTourStep.targetSelector);
        if (el) {
            const rect = el.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            setTargetRect(null);
        }
    }, [open, currentTourStep]);

    useEffect(() => {
        updateTargetRect();
        const handleResize = () => updateTargetRect();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        const observer = new MutationObserver(() => updateTargetRect());
        observer.observe(document.body, { childList: true, subtree: true });

        const interval = setInterval(updateTargetRect, 250);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
            observer.disconnect();
            clearInterval(interval);
        };
    }, [updateTargetRect]);

    if (!open) return null;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        onClose();
        if (location.pathname !== '/') {
            navigate('/');
        }
    };

    // Calculate popover card position relative to target
    const getCardPosition = () => {
        const padding = 16;
        const cardWidth = 380;
        const cardHeight = 240;

        if (!targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const placement = currentTourStep.placement || 'bottom';
        let top = 0;
        let left = 0;

        if (placement === 'bottom') {
            top = targetRect.bottom + padding;
            left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, targetRect.left + (targetRect.width / 2) - (cardWidth / 2)));
            // If overflowing bottom, flip to top
            if (top + cardHeight > window.innerHeight) {
                top = Math.max(padding, targetRect.top - cardHeight - padding);
            }
        } else if (placement === 'top') {
            top = Math.max(padding, targetRect.top - cardHeight - padding);
            left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, targetRect.left + (targetRect.width / 2) - (cardWidth / 2)));
        } else if (placement === 'right') {
            left = targetRect.right + padding;
            top = Math.max(padding, Math.min(window.innerHeight - cardHeight - padding, targetRect.top + (targetRect.height / 2) - (cardHeight / 2)));
        } else {
            top = targetRect.bottom + padding;
            left = targetRect.left;
        }

        return {
            top: `${top}px`,
            left: `${left}px`,
            position: 'fixed' as const,
        };
    };

    const cardPos = getCardPosition();

    return (
        <Portal>
            {/* Dark Spotlight Backdrop with transparent cutout hole */}
            <Box
                aria-hidden="true"
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1400,
                    pointerEvents: 'none',
                }}
            >
                <svg
                    width="100%"
                    height="100%"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'auto',
                    }}
                    onClick={onClose}
                >
                    <defs>
                        <mask id="tour-spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - 6}
                                    y={targetRect.top - 6}
                                    width={targetRect.width + 12}
                                    height={targetRect.height + 12}
                                    rx="10"
                                    ry="10"
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(15, 23, 42, 0.65)"
                        mask="url(#tour-spotlight-mask)"
                    />
                </svg>

                {/* Glowing border outline around the active target */}
                {targetRect && (
                    <Box
                        sx={{
                            position: 'fixed',
                            top: targetRect.top - 6,
                            left: targetRect.left - 6,
                            width: targetRect.width + 12,
                            height: targetRect.height + 12,
                            borderRadius: '10px',
                            border: '2px solid #3b82f6',
                            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.35), 0 0 20px rgba(59, 130, 246, 0.4)',
                            pointerEvents: 'none',
                            zIndex: 1401,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                )}
            </Box>

            {/* Floating Anchored Instruction Card */}
            <Box
                sx={{
                    ...cardPos,
                    width: { xs: 'calc(100vw - 32px)', sm: 390 },
                    maxWidth: 420,
                    zIndex: 1402,
                    bgcolor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.24), 0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'tourCardFadeIn 0.25s ease-out',
                    '@keyframes tourCardFadeIn': {
                        '0%': { opacity: 0, transform: 'scale(0.96) translateY(6px)' },
                        '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
                    },
                }}
            >
                {/* Header with Step Badge & Close button */}
                <Box sx={{
                    px: 2.5,
                    pt: 2,
                    pb: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #f1f5f9',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: 'rgba(37, 99, 235, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {currentTourStep.icon}
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#2563eb',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontFamily: "'Inter', 'Roboto', sans-serif",
                            }}>
                                {currentTourStep.badge}
                            </Typography>
                        </Box>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a' } }}
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                {/* Card Body */}
                <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography sx={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#0f172a',
                        fontFamily: "'Inter', 'Roboto', sans-serif",
                        lineHeight: 1.25,
                    }}>
                        {currentTourStep.title}
                    </Typography>

                    <Typography sx={{
                        fontSize: '13.5px',
                        color: '#475569',
                        lineHeight: 1.55,
                        fontFamily: "'Inter', 'Roboto', sans-serif",
                    }}>
                        {currentTourStep.description}
                    </Typography>

                    {/* Interactive Test Action Button (if applicable for step) */}
                    {currentTourStep.interactiveActionLabel && currentTourStep.onInteractiveAction && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PlayArrowRoundedIcon sx={{ fontSize: 18 }} />}
                            onClick={currentTourStep.onInteractiveAction}
                            sx={{
                                alignSelf: 'flex-start',
                                textTransform: 'none',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                borderColor: '#93c5fd',
                                color: '#1d4ed8',
                                bgcolor: '#eff6ff',
                                '&:hover': { bgcolor: '#dbeafe', borderColor: '#3b82f6' },
                                mt: 0.5,
                            }}
                        >
                            {currentTourStep.interactiveActionLabel}
                        </Button>
                    )}
                </Box>

                {/* Footer Navigation */}
                <Box sx={{
                    px: 2.5,
                    py: 1.75,
                    bgcolor: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Button
                        variant="text"
                        size="small"
                        onClick={onClose}
                        sx={{
                            textTransform: 'none',
                            color: '#64748b',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            minWidth: 'auto',
                            p: 0.5,
                            '&:hover': { color: '#0f172a', bgcolor: 'transparent' },
                        }}
                    >
                        Skip Tour
                    </Button>

                    {/* Step Dots */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {steps.map((_, idx) => (
                            <Box
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                sx={{
                                    width: idx === currentStep ? 18 : 6,
                                    height: 6,
                                    borderRadius: '3px',
                                    bgcolor: idx === currentStep ? '#2563eb' : '#cbd5e1',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            />
                        ))}
                    </Box>

                    {/* Back / Next Buttons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentStep > 0 && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleBack}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    borderRadius: '7px',
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    py: 0.5,
                                    px: 1.5,
                                    minWidth: 'auto',
                                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
                                }}
                            >
                                Back
                            </Button>
                        )}

                        <Button
                            variant="contained"
                            size="small"
                            endIcon={currentStep < steps.length - 1 ? <ArrowForwardIcon sx={{ fontSize: 14 }} /> : <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />}
                            onClick={handleNext}
                            sx={{
                                textTransform: 'none',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                bgcolor: '#2563eb',
                                py: 0.5,
                                px: 1.75,
                                minWidth: 'auto',
                                boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)',
                                '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Portal>
    );
};
