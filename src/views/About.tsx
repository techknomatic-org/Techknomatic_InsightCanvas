// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { FC } from "react";
import { Box, Typography, Button, useTheme, alpha, Divider, Card, CardContent, Chip, Stack } from "@mui/material";
import { textVar } from '../app/layout';
import { useNavigate } from "react-router-dom";

import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';

import techknomaticLogo from '../assets/techknomatic-official-logo.svg';
import techknomaticWhiteLogo from '../assets/techknomatic-white.svg';
import { useTranslation } from 'react-i18next';

interface CoreFeatureCardProps {
    badge: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    description: string;
    capabilities: {
        title: string;
        desc: string;
    }[];
    tags: string[];
    accentColor: string;
    buttonText: string;
    onAction: () => void;
}

const CoreFeatureCard: FC<CoreFeatureCardProps> = ({
    badge,
    icon,
    title,
    subtitle,
    description,
    capabilities,
    tags,
    accentColor,
    buttonText,
    onAction,
}) => {
    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                background: `
                    linear-gradient(180deg, ${alpha(accentColor, 0.03)} 0%, #ffffff 180px),
                    #ffffff
                `,
                '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: alpha(accentColor, 0.6),
                    boxShadow: `0 16px 36px ${alpha(accentColor, 0.12)}`,
                },
            }}
        >
            {/* Top Accent Strip */}
            <Box
                sx={{
                    height: 5,
                    width: '100%',
                    bgcolor: accentColor,
                    background: `linear-gradient(90deg, ${accentColor} 0%, ${alpha(accentColor, 0.5)} 100%)`,
                }}
            />

            <CardContent sx={{ p: { xs: 3, md: 4 }, flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                {/* Header Badge & Title */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: alpha(accentColor, 0.12),
                                color: accentColor,
                                border: `1px solid ${alpha(accentColor, 0.2)}`,
                                flexShrink: 0,
                            }}
                        >
                            {icon}
                        </Box>
                        <Box>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontSize: { xs: '19px', sm: '22px' },
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                    lineHeight: 1.25,
                                }}
                            >
                                {title}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: accentColor,
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                    mt: 0.25,
                                }}
                            >
                                {subtitle}
                            </Typography>
                        </Box>
                    </Box>

                    <Chip
                        label={badge}
                        size="small"
                        sx={{
                            bgcolor: alpha(accentColor, 0.1),
                            color: accentColor,
                            fontWeight: 700,
                            fontSize: '11px',
                            borderRadius: '8px',
                            border: `1px solid ${alpha(accentColor, 0.25)}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            height: 24,
                            px: 0.5,
                            flexShrink: 0,
                        }}
                    />
                </Box>

                {/* Main Description */}
                <Typography
                    sx={{
                        fontSize: '14px',
                        color: '#475569',
                        lineHeight: 1.65,
                        mb: 3,
                        fontFamily: "'Inter', 'Roboto', sans-serif",
                    }}
                >
                    {description}
                </Typography>

                <Divider sx={{ mb: 3, borderColor: '#f1f5f9' }} />

                {/* Key Capabilities Bullet Highlights */}
                <Typography
                    sx={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#64748b',
                        mb: 1.75,
                    }}
                >
                    Key Capabilities
                </Typography>

                <Stack spacing={1.75} sx={{ mb: 3.5 }}>
                    {capabilities.map((cap, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                            <CheckCircleRoundedIcon
                                sx={{
                                    fontSize: 18,
                                    color: accentColor,
                                    mt: 0.2,
                                    flexShrink: 0,
                                }}
                            />
                            <Typography
                                sx={{
                                    fontSize: '13px',
                                    color: '#334155',
                                    lineHeight: 1.5,
                                    fontFamily: "'Inter', 'Roboto', sans-serif",
                                }}
                            >
                                <Box component="span" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {cap.title}:{' '}
                                </Box>
                                {cap.desc}
                            </Typography>
                        </Box>
                    ))}
                </Stack>

                {/* Tags / Pills */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3.5, mt: 'auto' }}>
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                                fontSize: '11px',
                                fontWeight: 500,
                                bgcolor: '#f8fafc',
                                color: '#475569',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                            }}
                        />
                    ))}
                </Box>

                {/* Action Button */}
                <Button
                    variant="contained"
                    fullWidth
                    onClick={onAction}
                    endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                    sx={{
                        bgcolor: accentColor,
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        textTransform: 'none',
                        py: 1.15,
                        borderRadius: '10px',
                        boxShadow: `0 4px 14px ${alpha(accentColor, 0.25)}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            bgcolor: accentColor,
                            filter: 'brightness(0.9)',
                            boxShadow: `0 6px 20px ${alpha(accentColor, 0.35)}`,
                            transform: 'translateY(-1px)',
                        },
                    }}
                >
                    {buttonText}
                </Button>
            </CardContent>
        </Card>
    );
};

export const About: FC<{}> = function About() {
    const theme = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const canvasCapabilities = [
        {
            title: "Conversational Data Transformations",
            desc: "Filter, aggregate, join, unpivot (melt), and compute complex metrics using plain natural language prompts.",
        },
        {
            title: "Multi-Engine Visualization Core",
            desc: "30+ declarative chart types powered by Vega-Lite, Apache ECharts, D3.js, and Chart.js with interactive drag-and-drop shelf bindings.",
        },
        {
            title: "Non-Destructive Data Lineage",
            desc: "Branching data threads allow you to fork, backtrack, and compare analytical explorations without modifying raw source data.",
        },
        {
            title: "Enterprise Multi-Source Connectors",
            desc: "Direct connectivity to SQL Server, PostgreSQL, MySQL, Amazon S3, MongoDB, Kusto, and CSV/Excel files with Parquet caching.",
        },
        {
            title: "AI Aesthetic & Style Refinement",
            desc: "One-click styling agent applies publication-grade color palettes, typography scales, and accessible visual hierarchy.",
        },
    ];

    const biHubCapabilities = [
        {
            title: "1-Click Executive Dashboard Synthesis",
            desc: "Instantly generates 4 vital summary KPIs, interactive dimension slicers, and 6 diverse analytical visualizations with zero SQL coding.",
        },
        {
            title: "Sub-Second In-Memory Slicing",
            desc: "Embedded DuckDB columnar query execution ensures instant, zero-latency interactive filter updates across all metrics.",
        },
        {
            title: "Executive Intelligence Reporting",
            desc: "Produces in-depth C-suite analytical Markdown and PDF reports featuring root-cause attribution, risk scoring, and strategic action roadmaps.",
        },
        {
            title: "Automated Diversity & Layout Balancer",
            desc: "Intelligent schema matching ensures an optimal mix of composition (donut/pie), trend (line/area), and distribution charts.",
        },
        {
            title: "Session Persistence, Pinning & Favorites",
            desc: "Save, bookmark, and organize mission-critical dashboards for seamless team access across browser sessions.",
        },
    ];

    const pipelineSteps = [
        {
            num: "01",
            title: "Connect & Ingest",
            desc: "Attach enterprise SQL/NoSQL databases, cloud lakes, or drop CSV/Excel files into isolated workspaces.",
        },
        {
            num: "02",
            title: "Profile & Discover",
            desc: "Automated schema profiling, column semantic typing, and multi-table relational inference.",
        },
        {
            num: "03",
            title: "Synthesize Dashboard",
            desc: "1-click generation of 4 KPIs, slice filters, and 6 diverse analytical visualizations via BI Hub.",
        },
        {
            num: "04",
            title: "Conversational Refinement",
            desc: "Refine metrics, customize visual axes, or slice data instantly in sub-second time via DuckDB.",
        },
        {
            num: "05",
            title: "Executive Report & Export",
            desc: "Generate C-suite analytical reports with root-cause analysis and export clean borderless PDFs.",
        },
    ];

    return (
        <Box
            component="main"
            role="main"
            sx={{
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                width: '100%',
                height: '100%',
                bgcolor: '#f8fafc',
                background: `
                    radial-gradient(at 0% 0%, rgba(27, 117, 187, 0.05) 0px, transparent 50%),
                    radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.05) 0px, transparent 50%),
                    linear-gradient(90deg, ${alpha(theme.palette.text.secondary, 0.02)} 1px, transparent 1px),
                    linear-gradient(0deg, ${alpha(theme.palette.text.secondary, 0.02)} 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 100% 100%, 20px 20px, 20px 20px',
            }}
        >
            <Box sx={{ margin: '0 auto', py: { xs: 4, md: 6 }, px: { xs: 2.5, md: 5 }, maxWidth: 1200, width: '100%' }}>
                
                {/* ── Hero Section ───────────────────────────────────── */}
                <Box component="header" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 5 }}>
                    <Box
                        component="img"
                        src={theme.palette.mode === 'dark' ? techknomaticWhiteLogo : techknomaticLogo}
                        alt="Techknomatic"
                        sx={{ height: { xs: 52, sm: 68 }, maxWidth: 320, width: 'auto', mx: 'auto', display: 'block', mb: 2.5, objectFit: 'contain' }}
                    />
                    
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#e0f2fe', color: '#0369a1', px: 2, py: 0.6, borderRadius: '9999px', mb: 2 }}>
                        <AutoAwesomeOutlinedIcon sx={{ fontSize: 16 }} />
                        <Typography sx={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Enterprise Conversational & Autonomous Analytics
                        </Typography>
                    </Box>

                    <Typography
                        component="h1"
                        sx={{
                            fontSize: { xs: 32, sm: 46 },
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            color: '#0f172a',
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                            lineHeight: 1.15,
                            mb: 1.5,
                        }}
                    >
                        Welcome to <Box component="span" sx={{ color: '#1B75BB', background: 'linear-gradient(135deg, #1B75BB 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InsightCanvas</Box>
                    </Typography>

                    <Typography
                        component="p"
                        sx={{
                            fontSize: { xs: 15.5, sm: 18 },
                            color: '#64748b',
                            maxWidth: 800,
                            mx: 'auto',
                            lineHeight: 1.6,
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                        }}
                    >
                        Transform complex enterprise datasets into interactive multi-table dashboards, live reports, and executive business insights with autonomous AI agents.
                    </Typography>
                </Box>

                {/* ── 2 Core Features Section (Two Dedicated Cards) ───── */}
                <Box sx={{ mb: 6 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography
                            sx={{
                                fontSize: '12px',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#1B75BB',
                                mb: 0.5,
                            }}
                        >
                            Core Platform Pillars
                        </Typography>
                        <Typography
                            variant="h4"
                            sx={{
                                fontSize: { xs: '24px', sm: '28px' },
                                fontWeight: 800,
                                color: '#0f172a',
                                fontFamily: "'Inter', 'Roboto', sans-serif",
                            }}
                        >
                            Two Powerful Ways to Explore & Present Data
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                            gap: 3.5,
                        }}
                    >
                        {/* Core Feature 1: Interactive Data Canvas */}
                        <CoreFeatureCard
                            badge="Studio Pillar"
                            icon={<AutoFixHighOutlinedIcon sx={{ fontSize: 28 }} />}
                            title="Interactive Data Canvas"
                            subtitle="Conversational Formulation & Multi-Engine Visual Studio"
                            description="Bridges data preparation and visual analytics into a unified conversational studio. Transform, clean, reshape, and calculate metrics using plain natural language while an autonomous agent generates and runs secure Python/Pandas code in sandboxed environments with non-destructive lineage."
                            capabilities={canvasCapabilities}
                            tags={["Natural Language Transforms", "Pandas Code Gen", "Vega-Lite & ECharts", "30+ Chart Types", "Data Threads", "SQL & Cloud DBs"]}
                            accentColor="#1B75BB"
                            buttonText="Open Visual Canvas Studio"
                            onAction={() => navigate('/app')}
                        />

                        {/* Core Feature 2: Intelligence Hub */}
                        <CoreFeatureCard
                            badge="Autonomous BI"
                            icon={<DashboardCustomizeOutlinedIcon sx={{ fontSize: 28 }} />}
                            title="Intelligence Hub"
                            subtitle="Automated Full-Scale BI Dashboards & Executive Analytics"
                            description="Turns multi-table databases into complete, production-grade business intelligence dashboards in 1 click. Automatically profiles schemas, computes 4 vital business KPIs, establishes sub-second dimension filters, and generates C-suite analytical reports with root-cause attribution."
                            capabilities={biHubCapabilities}
                            tags={["Autonomous Dashboards", "4 KPIs + 6 Visuals", "Embedded DuckDB", "Sub-Second Slicing", "Executive Reports", "Session Pinning"]}
                            accentColor="#8B5CF6"
                            buttonText="Launch BI Hub"
                            onAction={() => {
                                try {
                                    localStorage.removeItem('ih_active_hub_state');
                                } catch {}
                                navigate('/intelligence-hub');
                            }}
                        />
                    </Box>
                </Box>

                {/* ── How It Works / Workflow Pipeline ────────────────── */}
                <Box
                    sx={{
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        p: { xs: 3, md: 4.5 },
                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                        mb: 5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, mb: 3.5 }}>
                        <HubOutlinedIcon sx={{ color: '#1B75BB', fontSize: 22 }} />
                        <Typography
                            sx={{
                                fontSize: '18px',
                                fontWeight: 700,
                                color: '#0f172a',
                                fontFamily: "'Inter', 'Roboto', sans-serif",
                            }}
                        >
                            The InsightCanvas End-to-End Workflow
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                            gap: 2,
                        }}
                    >
                        {pipelineSteps.map((step) => (
                            <Box
                                key={step.num}
                                sx={{
                                    p: 2.25,
                                    borderRadius: '12px',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #f1f5f9',
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        borderColor: '#cbd5e1',
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                                    },
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        color: '#1B75BB',
                                        mb: 0.75,
                                        fontFamily: "'Inter', monospace",
                                    }}
                                >
                                    {step.num}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '14.5px',
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        mb: 0.75,
                                        fontFamily: "'Inter', 'Roboto', sans-serif",
                                    }}
                                >
                                    {step.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '12.5px',
                                        color: '#64748b',
                                        lineHeight: 1.5,
                                        fontFamily: "'Inter', 'Roboto', sans-serif",
                                    }}
                                >
                                    {step.desc}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* ── Enterprise Assurance ───────────────────────────── */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: { xs: 2, md: 3.5 },
                        p: 2.5,
                        borderRadius: '14px',
                        bgcolor: 'rgba(255, 255, 255, 0.7)',
                        border: '1px dashed #cbd5e1',
                        mb: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: 18 }} />
                        <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                            Zero Raw Data Sent to External LLMs
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: 18 }} />
                        <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                            Sub-Second DuckDB Columnar Query Engine
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: 18 }} />
                        <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                            Isolated Python Execution Sandbox
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: 18 }} />
                        <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                            Self-Healing LLM Query Repair Pass
                        </Typography>
                    </Box>
                </Box>

            </Box>

            {/* ── Footer ────────────────────────────────────────────── */}
            <Box
                component="footer"
                role="contentinfo"
                sx={{
                    color: '#64748b',
                    display: 'flex',
                    flexWrap: 'wrap',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 1.25,
                    px: 2,
                    mt: 'auto',
                }}
            >
                <Button
                    size="small"
                    color="inherit"
                    sx={{ textTransform: 'none', fontSize: textVar.sm }}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Privacy & Cookies"
                    href="https://techknomatic.com/privacy-policy/"
                >
                    Privacy & Cookies
                </Button>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} aria-hidden="true" />
                <Button
                    size="small"
                    color="inherit"
                    sx={{ textTransform: 'none', fontSize: textVar.sm }}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Terms of Use"
                    href="https://techknomatic.com/terms-and-conditions/"
                >
                    Terms of Use
                </Button>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} aria-hidden="true" />
                <Button
                    size="small"
                    color="inherit"
                    sx={{ textTransform: 'none', fontSize: textVar.sm }}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Contact Us"
                    href="https://techknomatic.com/contact-us/"
                >
                    Contact Us
                </Button>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} aria-hidden="true" />
                <Typography component="span" sx={{ fontSize: textVar.sm, color: '#64748b', fontWeight: 500, ml: 0.5 }}>
                    © {new Date().getFullYear()} Techknomatic Services Pvt. Ltd.
                </Typography>
            </Box>
        </Box>
    );
};
