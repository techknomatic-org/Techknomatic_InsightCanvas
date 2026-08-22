// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { FC } from "react";
import { Box, Typography, Button, useTheme, alpha, Divider, Card, CardContent, Chip, Grid, Stack } from "@mui/material";
import { borderColor, radius } from '../app/tokens';
import { textVar } from '../app/layout';

import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import techknomaticLogo from '../assets/techknomatic-official-logo.svg';
import techknomaticWhiteLogo from '../assets/techknomatic-white.svg';
import { useTranslation } from 'react-i18next';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    tags: string[];
    accentColor: string;
}

const FeatureCard: FC<FeatureCardProps> = ({ icon, title, description, tags, accentColor }) => {
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
                '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: accentColor,
                    boxShadow: `0 12px 28px ${alpha(accentColor, 0.12)}`,
                },
            }}
        >
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
                            fontSize: '18px',
                            fontWeight: 700,
                            color: '#0f172a',
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                        }}
                    >
                        {title}
                    </Typography>
                </Box>

                <Typography
                    sx={{
                        fontSize: '14px',
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

    const capabilities: FeatureCardProps[] = [
        {
            icon: <ChatOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Conversational AI Analytics",
            description: "Chat with an intelligent data agent that understands your schemas, reasons over complex queries, automatically executes Python transformations, and delivers instant insights.",
            tags: ["Natural Language", "Pandas Code Gen", "Statistical Insights"],
            accentColor: "#1B75BB",
        },
        {
            icon: <StorageOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Enterprise Data Connectors",
            description: "Connect seamlessly to MySQL, PostgreSQL, Microsoft SQL Server, MongoDB, Cosmos DB, Azure Data Explorer (Kusto), Amazon S3, and local directories.",
            tags: ["Relational DBs", "NoSQL", "Cloud Lakes", "Local Files"],
            accentColor: "#0284c7",
        },
        {
            icon: <BarChartOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Multi-Engine Visualizations",
            description: "Declarative, high-fidelity visual rendering powered by Vega, Vega-Lite, Apache ECharts, D3.js, and Chart.js with AI-assisted aesthetic refinement.",
            tags: ["Vega-Lite", "Apache ECharts", "D3.js", "Chart.js"],
            accentColor: "#0d9488",
        },
        {
            icon: <ArticleOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Live Interactive Reporting",
            description: "Compose live Markdown reports with embedded charts and formulas. Visualizations dynamically refresh whenever your underlying source data updates.",
            tags: ["Live Sync", "Markdown Reports", "Exportable Dashboards"],
            accentColor: "#8b5cf6",
        },
        {
            icon: <SmartToyOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Multi-Model LLM Gateway",
            description: "Switch between world-class frontier models: OpenAI GPT-4o, Anthropic Claude 3.5, Google Gemini, DeepSeek, OpenRouter, or private local Ollama instances.",
            tags: ["OpenAI", "Claude", "Gemini", "Ollama", "DeepSeek"],
            accentColor: "#f59e0b",
        },
        {
            icon: <SecurityOutlinedIcon sx={{ fontSize: 24 }} />,
            title: "Enterprise Privacy & Sandboxing",
            description: "Your data stays private. Datasets are stored strictly in your local database/workspace; Python code execution runs in isolated sandboxes with strict memory limits.",
            tags: ["Local Data Only", "Isolated Sandbox", "Zero Leakage"],
            accentColor: "#10b981",
        },
    ];

    const pipelineSteps = [
        { num: "01", title: "Connect & Ingest", desc: "Attach databases, lakes, or drop CSV/Excel files" },
        { num: "02", title: "AI Prompt & Transform", desc: "Ask questions in natural language; agent writes code" },
        { num: "03", title: "Visualize & Polish", desc: "Generate publication-grade charts with AI styling" },
        { num: "04", title: "Report & Share", desc: "Author live synced dashboards and interactive reports" },
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
            <Box sx={{ margin: '0 auto', py: { xs: 4, md: 6 }, px: { xs: 2.5, md: 5 }, maxWidth: 1160, width: '100%' }}>
                
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
                            Enterprise Conversational Analytics
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
                            fontSize: { xs: 16, sm: 19 },
                            color: '#64748b',
                            maxWidth: 720,
                            mx: 'auto',
                            lineHeight: 1.55,
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                        }}
                    >
                        Turn complex enterprise datasets into interactive visualizations, live reports, and executive business insights with autonomous AI agents.
                    </Typography>
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
                        Key Platform Capabilities
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
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
                            The InsightCanvas Workflow
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                            gap: 2,
                        }}
                    >
                        {pipelineSteps.map((step) => (
                            <Box
                                key={step.num}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '12px',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #f1f5f9',
                                    textAlign: 'left',
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
                                        fontSize: '15px',
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
                                        fontSize: '13px',
                                        color: '#64748b',
                                        lineHeight: 1.45,
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
                        gap: { xs: 2, md: 4 },
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
                            Zero Raw Data Sent to Cloud LLMs
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
                            Native Enterprise SQL & NoSQL Drivers
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
                    backgroundColor: '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 1.25,
                    px: 2,
                    borderTop: '1px solid #e2e8f0',
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
