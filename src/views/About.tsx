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
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';

import techknomaticLogo from '../assets/techknomatic-official-logo.svg';
import techknomaticWhiteLogo from '../assets/techknomatic-white.svg';
import { useTranslation } from 'react-i18next';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    tags: string[];
    accentColor: string;
    badge?: string;
}

const FeatureCard: FC<FeatureCardProps> = ({ icon, title, description, tags, accentColor, badge }) => {
    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: accentColor,
                    boxShadow: `0 12px 28px ${alpha(accentColor, 0.12)}`,
                },
            }}
        >
            {badge && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        bgcolor: alpha(accentColor, 0.12),
                        color: accentColor,
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        px: 1.25,
                        py: 0.35,
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        border: `1px solid ${alpha(accentColor, 0.25)}`,
                    }}
                >
                    {badge}
                </Box>
            )}
            <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(accentColor, 0.1),
                            color: accentColor,
                        }}
                    >
                        {icon}
                    </Box>
                    <Typography
                        variant="h6"
                        sx={{
                            fontSize: '17px',
                            fontWeight: 700,
                            color: '#0f172a',
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                            pr: badge ? 7 : 0,
                        }}
                    >
                        {title}
                    </Typography>
                </Box>

                <Typography
                    sx={{
                        fontSize: '13.5px',
                        color: '#64748b',
                        lineHeight: 1.65,
                        flex: 1,
                        mb: 2.5,
                        fontFamily: "'Inter', 'Roboto', sans-serif",
                    }}
                >
                    {description}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 'auto' }}>
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                                fontSize: '11.5px',
                                fontWeight: 500,
                                bgcolor: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                            }}
                        />
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
};

export const About: FC<{}> = function About() {
    const theme = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const capabilities: FeatureCardProps[] = [
        {
            icon: <DashboardCustomizeOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "BI Hub & Autonomous Dashboards",
            description: "Autonomous multi-table schema profiling and 1-click dashboard synthesis. Automatically generates 4 Key Performance Indicators (KPIs), interactive categorical slicers, and 6 diverse analytical visualizations with zero manual query coding.",
            tags: ["Autonomous Dashboards", "4 KPIs + 6 Visuals", "DuckDB Slicers", "Self-Healing AI"],
            accentColor: "#1B75BB",
            badge: "Flagship",
        },
        {
            icon: <ArticleOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Executive Intelligence Reporting",
            description: "Generate in-depth, C-suite analytical Markdown reports directly from live dashboard KPIs and sliced charts. Features root-cause attribution, multi-dimensional trends, risk evaluation, prioritized strategic roadmaps, and clean borderless PDF exports.",
            tags: ["Executive Reports", "Root-Cause Attribution", "Clean PDF Export", "Action Roadmap"],
            accentColor: "#8b5cf6",
            badge: "New",
        },
        {
            icon: <ChatOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Conversational AI Analytics Studio",
            description: "Chat with an intelligent data agent that understands schemas, reasons over complex queries, automatically writes and executes Python/Pandas transformations in isolated sandboxes, and delivers iterative visual derivations.",
            tags: ["Natural Language", "Pandas Code Gen", "Statistical Insights", "Iterative Derivation"],
            accentColor: "#0284c7",
        },
        {
            icon: <StorageOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Enterprise Multi-Source Data Connectors",
            description: "Connect seamlessly to MySQL, PostgreSQL, Microsoft SQL Server, MongoDB, Cosmos DB, Azure Data Explorer (Kusto), Amazon S3, and local directories with automated Parquet conversion and catalog caching.",
            tags: ["Relational DBs", "NoSQL & Document", "Cloud Lakes & S3", "Parquet Caching"],
            accentColor: "#0d9488",
        },
        {
            icon: <BoltOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Embedded DuckDB In-Memory Query Engine",
            description: "Sub-second slicing, fast aggregations, and high-performance in-memory columnar query execution powered by embedded DuckDB without database round-trip latency or heavy infrastructure overhead.",
            tags: ["Embedded DuckDB", "Sub-Second Slicers", "Columnar Execution", "Instant Aggregation"],
            accentColor: "#e11d48",
            badge: "Engine",
        },
        {
            icon: <BarChartOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Multi-Engine Visualization Studio",
            description: "Declarative, publication-grade visual rendering powered by Vega, Vega-Lite, Apache ECharts, D3.js, and Chart.js with AI-assisted aesthetic refinement, responsive layouts, and curated enterprise color palettes.",
            tags: ["Vega-Lite", "Apache ECharts", "D3.js", "Chart.js", "AI Palette Styling"],
            accentColor: "#f59e0b",
        },
        {
            icon: <SmartToyOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Frontier Multi-Model AI Gateway",
            description: "Switch seamlessly between world-class frontier models: OpenAI GPT-4o, Anthropic Claude 3.5/3.7, Google Gemini 2.0, DeepSeek, OpenRouter, Azure OpenAI, or private local Ollama instances.",
            tags: ["OpenAI", "Claude", "Gemini", "DeepSeek", "Ollama", "Azure OpenAI"],
            accentColor: "#6366f1",
        },
        {
            icon: <SecurityOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Enterprise Privacy & Workspace Isolation",
            description: "Zero raw data egress to external LLMs (only schema definitions and small samples transmitted). Code executes inside isolated Python sandboxes with enterprise SSO/OIDC auth and portable session workspaces.",
            tags: ["Zero Data Leakage", "Isolated Sandbox", "OIDC / Azure AD", "Workspace Portability"],
            accentColor: "#10b981",
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
            <Box sx={{ margin: '0 auto', py: { xs: 4, md: 6 }, px: { xs: 2.5, md: 5 }, maxWidth: 1180, width: '100%' }}>
                
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
                            maxWidth: 760,
                            mx: 'auto',
                            lineHeight: 1.6,
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                            mb: 3,
                        }}
                    >
                        Turn complex enterprise datasets into interactive multi-table dashboards, live reports, and executive business insights with autonomous AI agents.
                    </Typography>

                    {/* Quick Navigation Action Buttons */}
                    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/intelligence-hub')}
                            startIcon={<DashboardCustomizeOutlinedIcon />}
                            endIcon={<ArrowForwardOutlinedIcon />}
                            sx={{
                                bgcolor: '#1B75BB',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '14px',
                                textTransform: 'none',
                                px: 3,
                                py: 1.1,
                                borderRadius: '10px',
                                boxShadow: '0 4px 14px rgba(27, 117, 187, 0.3)',
                                '&:hover': {
                                    bgcolor: '#135c96',
                                    boxShadow: '0 6px 20px rgba(27, 117, 187, 0.4)',
                                },
                            }}
                        >
                            Launch BI Hub
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/app')}
                            startIcon={<ChatOutlinedIcon />}
                            sx={{
                                color: '#1e293b',
                                borderColor: '#cbd5e1',
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                                px: 2.75,
                                py: 1.1,
                                borderRadius: '10px',
                                bgcolor: '#ffffff',
                                '&:hover': {
                                    borderColor: '#1B75BB',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        >
                            Open Visual Canvas Studio
                        </Button>
                    </Stack>
                </Box>

                {/* ── Capabilities Grid ───────────────────────────────── */}
                <Box sx={{ mb: 6 }}>
                    <Typography
                        sx={{
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#64748b',
                            mb: 3,
                        }}
                    >
                        Core Platform Capabilities
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                            gap: 2.5,
                        }}
                    >
                        {capabilities.map((cap) => (
                            <FeatureCard key={cap.title} {...cap} />
                        ))}
                    </Box>
                </Box>

                {/* ── How It Works / Pipeline ─────────────────────────── */}
                <Box
                    sx={{
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        p: { xs: 3, md: 4.5 },
                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                        mb: 6,
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
                            The InsightCanvas Workflow Architecture
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
