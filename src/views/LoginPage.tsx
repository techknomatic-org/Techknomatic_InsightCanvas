// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { FC, useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Link,
    useTheme,
    alpha,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import techknomaticLogo from "../assets/techknomatic-official-logo.svg";
import { getUserManager, getAuthInfo, isBackendAuth } from "../app/oidcConfig";
import { useSelector } from "react-redux";
import { DataFormulatorState } from "../app/dfSlice";

/** Official Microsoft 4-color icon */
const MicrosoftLogo: FC<{ size?: number }> = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
);

/** Floating Analytics Dashboard Card Illustration */
const AnalyticsDashboardIllustration: FC = () => {
    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                maxWidth: 420,
                mx: "auto",
                mb: 3.5,
            }}
        >
            {/* Main Window Card */}
            <Box
                sx={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid rgba(219, 228, 240, 0.9)",
                    boxShadow: "0 16px 36px -10px rgba(27, 117, 187, 0.12), 0 0 1px 1px rgba(0,0,0,0.03)",
                    p: 2,
                    position: "relative",
                    zIndex: 2,
                }}
            >
                {/* Window Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.5, borderBottom: "1px solid #f1f5f9", mb: 1.5 }}>
                    <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444" }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
                    </Box>
                    <Box sx={{ width: 80, height: 6, bgcolor: "#f1f5f9", borderRadius: "4px" }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
                    </Box>
                </Box>

                {/* Dashboard Body with Left Mini-Sidebar and Right Charts */}
                <Box sx={{ display: "flex", gap: 1.5 }}>
                    {/* Mini Sidebar */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, alignItems: "center", pr: 1, borderRight: "1px solid #f1f5f9" }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: "6px", bgcolor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0284c7">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                            </svg>
                        </Box>
                        <Box sx={{ width: 14, height: 14, borderRadius: "3px", bgcolor: "#e2e8f0" }} />
                        <Box sx={{ width: 14, height: 14, borderRadius: "3px", bgcolor: "#e2e8f0" }} />
                        <Box sx={{ width: 14, height: 14, borderRadius: "3px", bgcolor: "#e2e8f0" }} />
                    </Box>

                    {/* Charts Grid */}
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {/* Top Line Chart */}
                        <Box
                            sx={{
                                border: "1px solid #f1f5f9",
                                borderRadius: "10px",
                                p: 1,
                                bgcolor: "#fafcff",
                                height: 75,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                            }}
                        >
                            <svg viewBox="0 0 260 55" width="100%" height="55" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <line x1="0" y1="45" x2="260" y2="45" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                                <line x1="0" y1="25" x2="260" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                                <path
                                    d="M10 38 L50 36 L90 18 L130 28 L170 12 L210 16 L250 4"
                                    stroke="#1B75BB"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <circle cx="10" cy="38" r="3.5" fill="#1B75BB" />
                                <circle cx="50" cy="36" r="3.5" fill="#1B75BB" />
                                <circle cx="90" cy="18" r="3.5" fill="#1B75BB" />
                                <circle cx="130" cy="28" r="3.5" fill="#1B75BB" />
                                <circle cx="170" cy="12" r="3.5" fill="#1B75BB" />
                                <circle cx="210" cy="16" r="3.5" fill="#1B75BB" />
                                <circle cx="250" cy="4" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                            </svg>
                        </Box>

                        {/* Bottom Row: Donut Chart + Bars */}
                        <Box sx={{ display: "flex", gap: 1 }}>
                            {/* Donut Chart */}
                            <Box
                                sx={{
                                    flex: 1,
                                    border: "1px solid #f1f5f9",
                                    borderRadius: "10px",
                                    p: 0.8,
                                    bgcolor: "#fafcff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 0.8,
                                    height: 55,
                                }}
                            >
                                <svg width="40" height="40" viewBox="0 0 42 42">
                                    <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#1B75BB" strokeWidth="6" strokeDasharray="40 60" strokeDashoffset="25" />
                                    <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#F47920" strokeWidth="6" strokeDasharray="30 70" strokeDashoffset="85" />
                                    <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#22A048" strokeWidth="6" strokeDasharray="30 70" strokeDashoffset="55" />
                                </svg>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                                    <Box sx={{ width: 30, height: 4, bgcolor: "#1B75BB", borderRadius: "2px" }} />
                                    <Box sx={{ width: 22, height: 4, bgcolor: "#F47920", borderRadius: "2px" }} />
                                    <Box sx={{ width: 16, height: 4, bgcolor: "#22A048", borderRadius: "2px" }} />
                                </Box>
                            </Box>

                            {/* Bar Chart */}
                            <Box
                                sx={{
                                    flex: 1,
                                    border: "1px solid #f1f5f9",
                                    borderRadius: "10px",
                                    p: 0.8,
                                    bgcolor: "#fafcff",
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "space-around",
                                    height: 55,
                                    pb: 0.8,
                                }}
                            >
                                <Box sx={{ width: 6, height: "45%", bgcolor: "#93c5fd", borderRadius: "2px" }} />
                                <Box sx={{ width: 6, height: "70%", bgcolor: "#60a5fa", borderRadius: "2px" }} />
                                <Box sx={{ width: 6, height: "55%", bgcolor: "#3b82f6", borderRadius: "2px" }} />
                                <Box sx={{ width: 6, height: "90%", bgcolor: "#1B75BB", borderRadius: "2px" }} />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Subtle Potted Plant Accent */}
            <Box
                sx={{
                    position: "absolute",
                    right: -14,
                    bottom: -8,
                    zIndex: 3,
                }}
            >
                <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 28 C16 18 10 14 6 15 C4 20 12 25 18 29" fill="#22A048" opacity="0.9" />
                    <path d="M20 28 C24 16 32 12 36 14 C37 19 28 25 22 29" fill="#16a34a" />
                    <path d="M20 28 C18 12 22 6 25 6 C28 10 24 20 21 28" fill="#4ade80" />
                    {/* Pot */}
                    <path d="M12 30 L28 30 L25 46 L15 46 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                </svg>
            </Box>
        </Box>
    );
};

export const LoginPage: FC = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const identity = useSelector((state: DataFormulatorState) => state.identity);

    const handleSignIn = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const isBackend = await isBackendAuth();
            const authInfo = await getAuthInfo();
            if (isBackend) {
                window.location.href = authInfo?.login_url || "/api/auth/oidc/login";
                return;
            }
            const mgr = await getUserManager();
            if (mgr) {
                await mgr.signinRedirect();
            } else {
                // If SSO is not enabled on local/standalone server, establish session
                sessionStorage.setItem('df_logged_in', 'true');
                const isModelConfigured = !!localStorage.getItem('df_model_configured') || !!localStorage.getItem('df_selected_model');
                window.location.href = isModelConfigured ? "/app" : "/app?configure_model=true";
            }
        } catch (err: any) {
            console.error("[LoginPage] Sign-in failed:", err);
            setError(err?.message || "Sign in failed. Please contact your administrator.");
            setLoading(false);
        }
    }, []);

    // Check for errors returned in query params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const authErr = params.get("auth_error");
        if (authErr) {
            setError(decodeURIComponent(authErr));
        }
    }, []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f4f7fb",
                p: { xs: 2, sm: 3, md: 4 },
                boxSizing: "border-box",
                fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
            }}
        >
            {/* Main Centered Responsive Split-Card */}
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 920,
                    minHeight: { xs: "auto", md: 580 },
                    borderRadius: "22px",
                    overflow: "hidden",
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                    boxShadow: "0 20px 50px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.02)",
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    bgcolor: "#ffffff",
                }}
            >
                {/* ── LEFT PANEL (Authentication) ~46% ── */}
                <Box
                    sx={{
                        flex: { xs: "1 1 auto", md: "0 0 46%" },
                        p: { xs: 3.5, sm: 4, md: "44px 36px" },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        justifyContent: "space-between",
                        bgcolor: "#ffffff",
                        boxSizing: "border-box",
                    }}
                >
                    {/* Top & Middle Section */}
                    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                        {/* Centered Logo */}
                        <Box sx={{ mb: 2.5, display: "flex", justifyContent: "center", width: "100%" }}>
                            <Box
                                component="img"
                                src={techknomaticLogo}
                                alt="Techknomatic"
                                sx={{
                                    height: { xs: 48, sm: 56 },
                                    maxWidth: 240,
                                    width: "auto",
                                    objectFit: "contain",
                                    mx: "auto",
                                }}
                            />
                        </Box>

                        {/* Product Title: InsightCanvas */}
                        <Typography
                            component="h1"
                            sx={{
                                fontSize: { xs: 28, sm: 34 },
                                fontWeight: 800,
                                letterSpacing: "-0.03em",
                                lineHeight: 1.15,
                                color: "#0f172a",
                                textAlign: "center",
                                mb: 1.2,
                            }}
                        >
                            Insight<Box component="span" sx={{ color: "#1B75BB" }}>Canvas</Box>
                        </Typography>

                        {/* Tagline */}
                        <Typography
                            sx={{
                                fontSize: { xs: 13.5, sm: 14.5 },
                                color: "#64748b",
                                lineHeight: 1.5,
                                fontWeight: 400,
                                textAlign: "center",
                                mb: { xs: 4, sm: 4.5 },
                            }}
                        >
                            AI-powered data exploration, visualization,<br />
                            and reporting.
                        </Typography>

                        {/* Welcome Back Greeting */}
                        <Typography
                            component="h2"
                            sx={{
                                fontSize: { xs: 24, sm: 28 },
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                                color: "#0f172a",
                                textAlign: "center",
                                mb: 0.8,
                            }}
                        >
                            Welcome Back!
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: { xs: 13.5, sm: 14.5 },
                                color: "#64748b",
                                textAlign: "center",
                                mb: 3.5,
                            }}
                        >
                            Please login to continue
                        </Typography>

                        {/* Error Alert if any */}
                        {error && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: "10px", width: "100%", maxWidth: 380, textAlign: "left" }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        {/* Microsoft Sign-In Button */}
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={handleSignIn}
                            disabled={loading}
                            sx={{
                                maxWidth: 380,
                                height: 52,
                                borderRadius: "12px",
                                borderColor: "#e2e8f0",
                                borderWidth: "1.5px",
                                bgcolor: "#ffffff",
                                color: "#0f172a",
                                textTransform: "none",
                                fontSize: "15.5px",
                                fontWeight: 600,
                                letterSpacing: "-0.01em",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1.5,
                                mx: "auto",
                                transition: "all 0.2s ease-in-out",
                                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                                "&:hover": {
                                    borderColor: "#cbd5e1",
                                    bgcolor: "#f8fafc",
                                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
                                },
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={20} thickness={4} sx={{ color: "#1B75BB" }} />
                            ) : (
                                <>
                                    <MicrosoftLogo size={20} />
                                    <span>Sign in with Microsoft</span>
                                </>
                            )}
                        </Button>

                        {/* Secure Login Subtext */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.8,
                                mt: 1.8,
                                color: "#64748b",
                            }}
                        >
                            <LockOutlinedIcon sx={{ fontSize: 15, color: "#64748b" }} />
                            <Typography sx={{ fontSize: 12.5, fontWeight: 400 }}>
                                Secure login with your organization Microsoft account
                            </Typography>
                        </Box>
                    </Box>

                    {/* Bottom Admin Contact */}
                    <Box sx={{ mt: { xs: 4, sm: 5 }, textAlign: "center", width: "100%" }}>
                        <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                            Don't have access?{" "}
                            <Link
                                href="mailto:support@techknomatic.com?subject=InsightCanvas%20Access%20Request"
                                sx={{
                                    color: "#1B75BB",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    "&:hover": { textDecoration: "underline" },
                                }}
                            >
                                Contact your administrator.
                            </Link>
                        </Typography>
                    </Box>
                </Box>

                {/* ── RIGHT PANEL (Illustration & Feature Highlights) ~55% ── */}
                <Box
                    sx={{
                        flex: { xs: "1 1 auto", md: "0 0 54%" },
                        bgcolor: "#f0f4f9",
                        p: { xs: 3.5, sm: 4, md: "44px 36px" },
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        borderLeft: { md: "1px solid rgba(226, 232, 240, 0.8)" },
                        boxSizing: "border-box",
                    }}
                >
                    {/* Analytics Dashboard Card Illustration */}
                    <AnalyticsDashboardIllustration />

                    {/* 3 Feature Highlights */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, maxWidth: 420, mx: "auto", width: "100%" }}>
                        {/* 1. Explore Data */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.8 }}>
                            <Box
                                sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    bgcolor: "#e0f2fe",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    mt: 0.3,
                                }}
                            >
                                <BarChartRoundedIcon sx={{ fontSize: 20, color: "#0284c7" }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                                    Explore Data
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: "#64748b", mt: 0.3, lineHeight: 1.4 }}>
                                    Upload files or connect to databases and explore your data.
                                </Typography>
                            </Box>
                        </Box>

                        {/* 2. AI-Powered Insights */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.8 }}>
                            <Box
                                sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    bgcolor: "#dcfce7",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    mt: 0.3,
                                }}
                            >
                                <AutoAwesomeRoundedIcon sx={{ fontSize: 19, color: "#16a34a" }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                                    AI-Powered Insights
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: "#64748b", mt: 0.3, lineHeight: 1.4 }}>
                                    Ask questions in plain English and let AI transform your data into meaningful insights.
                                </Typography>
                            </Box>
                        </Box>

                        {/* 3. Visualize & Report */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.8 }}>
                            <Box
                                sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    bgcolor: "#f3e8ff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    mt: 0.3,
                                }}
                            >
                                <PieChartRoundedIcon sx={{ fontSize: 19, color: "#9333ea" }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                                    Visualize & Report
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: "#64748b", mt: 0.3, lineHeight: 1.4 }}>
                                    Automatically create charts, dashboards, and reports from your analysis.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* Subtle Footer */}
            <Typography
                sx={{
                    mt: 3,
                    fontSize: 12,
                    color: "#94a3b8",
                    textAlign: "center",
                    fontWeight: 400,
                }}
            >
                © 2024 Techknomatic Services Pvt. Ltd. All rights reserved.
            </Typography>
        </Box>
    );
};
