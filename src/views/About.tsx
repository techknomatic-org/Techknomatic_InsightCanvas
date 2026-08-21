// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { Box, Typography, Button, useTheme, alpha, Divider } from "@mui/material";
import { borderColor, radius } from '../app/tokens';
import { textVar } from '../app/layout';
import React, { FC } from "react";
import GridViewIcon from '@mui/icons-material/GridView';
import GitHubIcon from '@mui/icons-material/GitHub';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { AgentIcon as PrecisionManufacturingIcon } from '../icons';

import { toolName } from "../app/App";
import dfLogo from '../assets/df-logo.svg';
import techknomaticLogo from '../assets/techknomatic-official-logo.svg';
import techknomaticWhiteLogo from '../assets/techknomatic-white.svg';
import { useSelector } from "react-redux";
import { DataFormulatorState } from "../app/dfSlice";
import { useTranslation } from 'react-i18next';


interface Feature {
    title: string;
    description: string;
    media: string;
    mediaType: 'image' | 'video';
}

export const About: FC<{}> = function About({ }) {
    const theme = useTheme();
    const { t } = useTranslation();

    const features: Feature[] = [
        {
            title: t('about.feature1Title'),
            description: t('about.feature1Description'),
            media: "/feature-extract-data.mp4",
            mediaType: "video"
        },
        {
            title: t('about.feature2Title'),
            description: t('about.feature2Description'),
            media: "/feature-agent-mode.mp4",
            mediaType: "video"
        },
        {
            title: t('about.feature3Title'),
            description: t('about.feature3Description'),
            media: "/feature-interactive-control.mp4",
            mediaType: "video"
        },
        {
            title: t('about.feature4Title'),
            description: t('about.feature4Description'),
            media: "/feature-generate-report.mp4",
            mediaType: "video"
        }
    ];

    let actionButtons = (
        <Box component="nav" aria-label="Primary actions" sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
            <Button size="large" variant="outlined" color="primary" 
                sx={{ textTransform: 'none' }}
                startIcon={<Box component="img" sx={{ width: 20, height: 20 }} alt="" aria-hidden="true" src="/pip-logo.svg" />}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('about.installViaPipAria')}
                href="https://pypi.org/project/data-formulator/"
            >{t('about.installLocally')}</Button>
            <Button size="large" variant="contained" color="primary" 
                sx={{ textTransform: 'none' }}
                startIcon={<GridViewIcon aria-hidden="true" />}
                href="/app"
            >{t('about.tryOnlineDemo')}</Button>
            <Button size="large" variant="outlined" color="primary" 
                sx={{ textTransform: 'none' }}
                startIcon={<YouTubeIcon sx={{ color: '#FF0000' }} aria-hidden="true" />}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('about.watchVideoAria')}
                href="https://www.youtube.com/watch?v=GfTE2FLyMrs"
            >{t('about.video')}</Button>
            <Button size="large" variant="outlined" color="primary" 
                sx={{ textTransform: 'none' }}
                startIcon={<GitHubIcon aria-hidden="true" />}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('about.viewGithubAria')}
                href="https://github.com/microsoft/data-formulator"
            >{t('about.github')}</Button>
        </Box>
    );

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
                background: `
                    linear-gradient(90deg, ${alpha(theme.palette.text.secondary, 0.01)} 1px, transparent 1px),
                    linear-gradient(0deg, ${alpha(theme.palette.text.secondary, 0.01)} 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px',
            }}
        >
            <Box sx={{margin:'auto', py: 4, display: "flex", flexDirection: "column", textAlign: "center", maxWidth: 1000, width: '100%', px: 3}}>
                {/* Header with title */}
                <Box component="header" sx={{display: 'flex', flexDirection: 'column', mx: 'auto', mt: 2, alignItems: 'center'}}>
                    <Box 
                        component="img" 
                        src={theme.palette.mode === 'dark' ? techknomaticWhiteLogo : techknomaticLogo} 
                        alt="Techknomatic" 
                        sx={{ height: { xs: 64, sm: 84 }, maxWidth: 380, width: 'auto', mb: 2.5, objectFit: 'contain' }} 
                    />
                    <Typography component="h1" sx={{ fontSize: { xs: 36, sm: 54 }, fontWeight: 800, letterSpacing: '-0.025em' }}>
                        Welcome to <Box component="span" sx={{ color: '#2b50ec' }}>InsightCanvas</Box>
                    </Typography> 
                    <Typography component="p" sx={{ 
                        fontSize: { xs: 18, sm: 22 }, color: theme.palette.text.secondary, 
                        textAlign: 'center', mt: 1.5, mb: 4, fontWeight: 500}}>
                        Turn your data into actionable business insights with AI.
                    </Typography>
                </Box>
                
                {actionButtons}

                {/* Features Grid - 2 columns, 4 rows */}
                <Box 
                    component="section" 
                    aria-label={t('about.featuresAria')}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 5, mt: 2 }}
                >
                    {features.map((feature, index) => (
                        <Box 
                            component="article"
                            key={index}
                            aria-labelledby={`feature-title-${index}`}
                            sx={{ 
                                display: 'flex', 
                                flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
                                gap: 4,
                                alignItems: 'center',
                            }}
                        >
                            {/* Text Content */}
                            <Box sx={{ 
                                flex: 1,
                                textAlign: index % 2 === 0 ? 'left' : 'right',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}>
                                <Typography 
                                    component="h2"
                                    id={`feature-title-${index}`}
                                    sx={{ 
                                        fontSize: 28,
                                        fontWeight: 500,
                                        mb: 1.5,
                                        color: theme.palette.text.primary,
                                    }}
                                >
                                    {feature.title}
                                </Typography>
                                <Typography 
                                    component="p"
                                    sx={{ 
                                        fontSize: textVar.xxl,
                                        color: 'text.secondary', 
                                        lineHeight: 1.7,
                                    }}
                                >
                                    {feature.description}
                                </Typography>
                            </Box>

                            {/* Media Content */}
                            <Box sx={{ 
                                flex: 1,
                                borderRadius: radius.md,
                                overflow: 'hidden',
                                border: `1px solid ${borderColor.divider}`,
                            }}>
                                {feature.mediaType === 'video' ? (
                                    <Box
                                        component="video"
                                        src={feature.media}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="metadata"
                                        aria-label={t('about.videoDemoAria', { title: feature.title })}
                                        sx={{
                                            width: '100%',
                                            height: 'auto',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <Box
                                        component="img"
                                        src={feature.media}
                                        alt={feature.title}
                                        loading="lazy"
                                        sx={{
                                            width: '100%',
                                            height: 'auto',
                                            display: 'block',
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ mt: 6, mx: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>{t('about.dataHandling')}</strong> {t('about.dataHandlingText')}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                        {t('about.researchPrototype')}
                    </Typography>
                </Box>
            </Box>

            {/* Footer */}
            <Box 
                component="footer"
                role="contentinfo"
                sx={{ color: 'text.secondary', display: 'flex', 
                    backgroundColor: 'rgba(255, 255, 255, 0.89)',
                    alignItems: 'center', justifyContent: 'center',
                    py: 0.75,
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}
            >
                <Button size="small" color="inherit" 
                        sx={{ textTransform: 'none', fontSize: textVar.sm }} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="Privacy & Cookies"
                        href="https://techknomatic.com/privacy-policy/">Privacy & Cookies</Button>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} aria-hidden="true" />
                <Button size="small" color="inherit" 
                        sx={{ textTransform: 'none', fontSize: textVar.sm }} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="Terms of Use"
                        href="https://techknomatic.com/terms-and-conditions/">Terms of Use</Button>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} aria-hidden="true" />
                <Button size="small" color="inherit" 
                        sx={{ textTransform: 'none', fontSize: textVar.sm }} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="Contact Us"
                        href="https://techknomatic.com/contact-us/">Contact Us</Button>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} aria-hidden="true" />
                <Typography component="span" sx={{ fontSize: textVar.sm, color: 'text.secondary', fontWeight: 500, ml: 0.5 }}>
                    © {new Date().getFullYear()} Techknomatic Services Pvt. Ltd.
                </Typography>
            </Box>
        </Box>)
}
