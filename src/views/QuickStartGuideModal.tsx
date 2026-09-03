// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * QuickStartGuideModal — Spotlight-Pointed Interactive Guide & Walkthrough
 * Dynamically highlights and points to each section of InsightCanvas on Next/Back.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Divider,
    alpha,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';

export interface QuickStartGuideModalProps {
    open: boolean;
    onClose: () => void;
}

interface StepItem {
    targetId: string;
    badge: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    accentColor: string;
    content: React.ReactNode;
}

export const QuickStartGuideModal: React.FC<QuickStartGuideModalProps> = ({ open, onClose }) => {
    const theme = useTheme();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const steps: StepItem[] = [
        {
            targetId: 'tour-nav-settings',
            badge: 'Step 1 of 6 · AI Model Setup',
            title: 'Select & Configure AI Model',
            subtitle: 'Choose AI providers (OpenAI, Claude, Azure, Ollama) from Settings',
            icon: <TuneOutlinedIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
            iconBg: 'rgba(37, 99, 235, 0.12)',
            accentColor: '#2563eb',
            content: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        First, configure or verify your AI Model provider in <strong>Settings</strong>:
                    </Typography>
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#f0f6ff', border: '1px solid #dbeafe' }}>
                        <Typography sx={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>
                            ⚙️ Select <strong>OpenAI, Anthropic Claude, Azure OpenAI, or local Ollama</strong> to power all natural-language formulations, chart recommendations, and agent queries.
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            targetId: 'tour-btn-upload',
            badge: 'Step 2 of 6 · Upload Data',
            title: 'Upload Data from Home Screen',
            subtitle: 'Import CSV, Excel (.xlsx), JSON, and Parquet datasets',
            icon: <UploadFileOutlinedIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
            iconBg: 'rgba(37, 99, 235, 0.12)',
            accentColor: '#2563eb',
            content: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Import your local datasets directly from the home screen:
                    </Typography>
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#f0f6ff', border: '1px solid #dbeafe' }}>
                        <Typography sx={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>
                            📁 Click <strong>"Upload Data"</strong> to import Excel workbooks (.xlsx), CSV, JSON, or Parquet datasets into your canvas.
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            targetId: 'tour-btn-connect-db',
            badge: 'Step 3 of 6 · Connect Database',
            title: 'Connect Database from Home Screen',
            subtitle: 'Connect MySQL, PostgreSQL, Snowflake & BigQuery',
            icon: <StorageRoundedIcon sx={{ fontSize: 28, color: '#f59e0b' }} />,
            iconBg: 'rgba(245, 158, 11, 0.15)',
            accentColor: '#f59e0b',
            content: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Establish live connections to databases and cloud warehouses:
                    </Typography>
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                        <Typography sx={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>
                            🛢️ Click <strong>"Connect Database"</strong> to connect live relational databases (MySQL, Postgres, SQL Server, BigQuery, Snowflake) with pushdown querying.
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            targetId: 'tour-rail-sessions',
            badge: 'Step 4 of 6 · Navigation Rail',
            title: 'Navigation Rail — Sessions Icon',
            subtitle: 'Open and manage analysis workspaces and saved sessions',
            icon: <FolderOutlinedIcon sx={{ fontSize: 28, color: '#7c3aed' }} />,
            iconBg: 'rgba(124, 58, 237, 0.12)',
            accentColor: '#7c3aed',
            content: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Manage your analysis projects from the left navigation rail:
                    </Typography>
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: 'rgba(124, 58, 237, 0.06)', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
                        <Typography sx={{ fontSize: '12px', color: '#5b21b6', fontWeight: 500 }}>
                            📁 Click the <strong>Sessions (Folder) icon</strong> in the left rail to view all saved workspaces, resume previous sessions, or export project snapshots.
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            targetId: 'tour-rail-sources',
            badge: 'Step 5 of 6 · Load Data',
            title: 'Load Data to Session',
            subtitle: 'Select and load tables into your active analysis canvas',
            icon: <StorageRoundedIcon sx={{ fontSize: 28, color: '#059669' }} />,
            iconBg: 'rgba(5, 150, 105, 0.12)',
            accentColor: '#059669',
            content: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Pick tables to load into your active workspace session:
                    </Typography>
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <Typography sx={{ fontSize: '12px', color: '#166534', fontWeight: 500 }}>
                            📊 Browse connected tables in the sidebar catalog, preview column types, and click to load them directly into your active canvas.
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            targetId: 'tour-rail-hub',
            badge: 'Step 6 of 6 · BI HUB',
            title: 'Navigation Rail — BI HUB',
            subtitle: 'Inspect schema metadata, table lineage & autonomous dashboards',
            icon: <PsychologyOutlinedIcon sx={{ fontSize: 28, color: '#0284c7' }} />,
            iconBg: 'rgba(2, 132, 199, 0.12)',
            accentColor: '#0284c7',
            content: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Explore enterprise metadata and relations:
                    </Typography>
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                        <Typography sx={{ fontSize: '12px', color: '#0369a1', fontWeight: 500 }}>
                            🧠 Click the <strong>BI HUB</strong> icon in the Navigation Rail (or top bar) to generate autonomous dashboards, view foreign key relationships, and inspect table schemas.
                        </Typography>
                    </Box>
                </Box>
            ),
        },
    ];

    const currentSlide = steps[currentStep] || steps[0];

    // Measure target element position whenever currentStep changes
    const updateTargetRect = useCallback(() => {
        if (!open) return;
        let targetEl = document.getElementById(currentSlide.targetId);
        // Fallbacks for related identifiers
        if (!targetEl) {
            if (currentSlide.targetId === 'tour-rail-hub') {
                targetEl = document.getElementById('tour-nav-hub');
            } else if (currentSlide.targetId === 'tour-nav-settings') {
                targetEl = document.getElementById('tour-model-select') || document.getElementById('tour-top-nav');
            } else if (currentSlide.targetId === 'tour-rail-sources') {
                targetEl = document.getElementById('tour-sidebar');
            }
        }

        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect(rect);
                return;
            }
        }
        setTargetRect(null);
    }, [open, currentSlide.targetId]);

    useEffect(() => {
        if (!open) return;
        updateTargetRect();
        const anim = requestAnimationFrame(() => updateTargetRect());
        const timer = setTimeout(() => updateTargetRect(), 80);
        const handleResize = () => updateTargetRect();
        const handleScroll = () => updateTargetRect();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            cancelAnimationFrame(anim);
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open, currentStep, updateTargetRect]);

    if (!open) return null;

    // Calculate smart card placement around the highlighted element
    const computeCardStyle = (): React.CSSProperties => {
        const cardWidth = Math.min(420, window.innerWidth - 32);
        const cardHeight = 310;

        if (!targetRect) {
            // Fallback: centered
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${cardWidth}px`,
                zIndex: 10002,
            };
        }

        const margin = 16;
        let top = 0;
        let left = 0;

        if (currentSlide.targetId === 'tour-top-nav' || currentSlide.targetId === 'tour-nav-hub' || currentSlide.targetId === 'tour-nav-settings') {
            top = targetRect.bottom + margin;
            left = Math.max(margin, Math.min(targetRect.left - (cardWidth / 2), window.innerWidth - cardWidth - margin));
        } else if (currentSlide.targetId === 'tour-sidebar' || currentSlide.targetId === 'tour-rail-sessions' || currentSlide.targetId === 'tour-rail-sources' || currentSlide.targetId === 'tour-rail-hub') {
            left = targetRect.right + margin;
            top = Math.max(margin, Math.min(targetRect.top - 20, window.innerHeight - cardHeight - margin));
        } else if (currentSlide.targetId === 'tour-btn-upload' || currentSlide.targetId === 'tour-btn-connect-db') {
            top = Math.max(margin, targetRect.top - cardHeight - margin);
            left = Math.max(margin, Math.min(targetRect.left - 20, window.innerWidth - cardWidth - margin));
        } else if (currentSlide.targetId === 'tour-features-section' || currentSlide.targetId === 'tour-hero-section') {
            if (targetRect.right + cardWidth + margin < window.innerWidth) {
                left = targetRect.right + margin;
                top = Math.max(margin, Math.min(targetRect.top - 10, window.innerHeight - cardHeight - margin));
            } else {
                top = Math.max(margin, targetRect.top - cardHeight - margin);
                left = Math.max(margin, targetRect.left);
            }
        } else {
            top = Math.max(margin, Math.min(targetRect.bottom + margin, window.innerHeight - cardHeight - margin));
            left = Math.max(margin, Math.min(targetRect.left, window.innerWidth - cardWidth - margin));
        }

        // Viewport bounds clamp
        top = Math.max(margin, Math.min(top, window.innerHeight - cardHeight - margin));
        left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));

        return {
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${cardWidth}px`,
            zIndex: 10002,
            transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        };
    };

    const pad = 6;

    return (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'auto' }}>
            {/* SVG Mask Spotlight Cutout */}
            <svg
                style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    pointerEvents: 'none',
                    zIndex: 10000,
                }}
            >
                <defs>
                    <mask id="guide-spotlight-mask">
                        <rect x="0" y="0" width="100vw" height="100vh" fill="#ffffff" />
                        {targetRect && (
                            <rect
                                x={Math.max(0, targetRect.left - pad)}
                                y={Math.max(0, targetRect.top - pad)}
                                width={targetRect.width + pad * 2}
                                height={targetRect.height + pad * 2}
                                rx="10"
                                ry="10"
                                fill="#000000"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100vw"
                    height="100vh"
                    fill="rgba(15, 23, 42, 0.62)"
                    mask="url(#guide-spotlight-mask)"
                />
            </svg>

            {/* Glowing Pulsing Highlight Border over Target Section */}
            {targetRect && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: Math.max(0, targetRect.top - pad),
                        left: Math.max(0, targetRect.left - pad),
                        width: targetRect.width + pad * 2,
                        height: targetRect.height + pad * 2,
                        borderRadius: '10px',
                        border: '2.5px solid #2563eb',
                        boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.35), 0 8px 32px rgba(37, 99, 235, 0.25)',
                        pointerEvents: 'none',
                        zIndex: 10001,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: 'guidePulse 2s infinite ease-in-out',
                        '@keyframes guidePulse': {
                            '0%': { boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.3), 0 0 16px rgba(37, 99, 235, 0.2)' },
                            '50%': { boxShadow: '0 0 0 6px rgba(37, 99, 235, 0.5), 0 0 24px rgba(37, 99, 235, 0.4)' },
                            '100%': { boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.3), 0 0 16px rgba(37, 99, 235, 0.2)' },
                        },
                    }}
                />
            )}

            {/* Floating Pointed Guide Card */}
            <Box
                ref={cardRef}
                style={computeCardStyle()}
                sx={{
                    bgcolor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <Box sx={{
                    px: 2.5,
                    pt: 2.25,
                    pb: 1.25,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: currentSlide.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {currentSlide.icon}
                        </Box>
                        <Box>
                            <Box sx={{
                                display: 'inline-block',
                                px: 1,
                                py: 0.2,
                                mb: 0.3,
                                borderRadius: '5px',
                                bgcolor: alpha(currentSlide.accentColor, 0.1),
                                color: currentSlide.accentColor,
                                fontSize: '10.5px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                            }}>
                                {currentSlide.badge}
                            </Box>
                            <Typography sx={{
                                fontSize: '16.5px',
                                fontWeight: 800,
                                color: '#0f172a',
                                lineHeight: 1.2,
                                fontFamily: "'Inter', 'Roboto', sans-serif",
                            }}>
                                {currentSlide.title}
                            </Typography>
                            <Typography sx={{
                                fontSize: '12px',
                                color: '#64748b',
                                fontFamily: "'Inter', 'Roboto', sans-serif",
                            }}>
                                {currentSlide.subtitle}
                            </Typography>
                        </Box>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{
                            color: '#94a3b8',
                            p: 0.5,
                            '&:hover': { color: '#0f172a', bgcolor: 'rgba(0, 0, 0, 0.05)' },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                <Divider sx={{ borderColor: '#f1f5f9' }} />

                {/* Body */}
                <Box sx={{
                    px: 2.5,
                    py: 1.75,
                    minHeight: 105,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}>
                    {currentSlide.content}
                </Box>

                <Divider sx={{ borderColor: '#f1f5f9' }} />

                {/* Footer Controls */}
                <Box sx={{
                    px: 2.25,
                    py: 1.5,
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Skip Button */}
                        <Button
                            variant="text"
                            size="small"
                            onClick={onClose}
                            sx={{
                                textTransform: 'none',
                                color: '#64748b',
                                fontWeight: 600,
                                fontSize: '12px',
                                p: 0.5,
                                minWidth: 'auto',
                                '&:hover': { color: '#0f172a', bgcolor: 'transparent' },
                            }}
                        >
                            Skip
                        </Button>

                        {/* Step Indicators */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            bgcolor: idx === currentStep ? '#1d4ed8' : '#94a3b8',
                                        },
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentStep > 0 && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: '7px',
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    px: 1.5,
                                    py: 0.5,
                                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
                                }}
                            >
                                Back
                            </Button>
                        )}

                        {currentStep < steps.length - 1 ? (
                            <Button
                                variant="contained"
                                size="small"
                                endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: '7px',
                                    bgcolor: '#2563eb',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    px: 2,
                                    py: 0.5,
                                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={onClose}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: '7px',
                                    bgcolor: '#2563eb',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    px: 2.25,
                                    py: 0.5,
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Get Started 🚀
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
