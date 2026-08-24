// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * Sign-in / sign-out button rendered in the AppBar.
 *
 * Behaviour depends on the current identity state:
 * - Authenticated (`user:*`)  → show display name + sign-out icon
 * - Anonymous with OIDC active → show "Sign In" button
 * - Anonymous without OIDC     → render nothing
 */

import { FC, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Box, Button, IconButton, Snackbar, Tooltip, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import { useTranslation } from "react-i18next";
import type { UserManager } from "oidc-client-ts";
import { dfActions, type DataFormulatorState } from "./dfSlice";
import type { AppDispatch } from "./store";
import type { AuthInfo } from "./oidcConfig";
import { persistor } from "./store";
import { getBrowserId } from "./identity";
import { apiRequest } from "./apiClient";
import { iconVar, textVar } from './layout';

export const AuthButton: FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch<AppDispatch>();
    const identity = useSelector((s: DataFormulatorState) => s.identity);
    const [mgr, setMgr] = useState<UserManager | null>(null);
    const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { getAuthInfo, getUserManager } = await import("./oidcConfig");
                const info = await getAuthInfo();
                if (!cancelled) {
                    setAuthInfo(info);
                }
                const manager = await getUserManager();
                if (!cancelled) {
                    setMgr(manager);
                }
            } catch (err) {
                if (cancelled) return;
                console.error("[AuthButton] Failed to initialise SSO:", err);
                setInitError(err instanceof Error ? err.message : String(err));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const isBackend = authInfo?.action === "backend";

    const handleSignOut = useCallback(async () => {
        sessionStorage.removeItem('df_logged_in');
        localStorage.removeItem('df_logged_in');
        if (isBackend) {
            await apiRequest(authInfo?.logout_url || "/api/auth/oidc/logout", { method: "POST" });
            const browserId = getBrowserId();
            dispatch(dfActions.setIdentity({ type: "browser", id: browserId }));
            localStorage.setItem("df_identity_type", "browser");
            localStorage.setItem("df_browser_id", browserId);
            await persistor.flush();
            window.location.href = "/login";
            return;
        }
        if (!mgr) {
            const browserId = getBrowserId();
            dispatch(dfActions.setIdentity({ type: "browser", id: browserId }));
            localStorage.setItem("df_identity_type", "browser");
            localStorage.setItem("df_browser_id", browserId);
            window.location.href = "/login";
            return;
        }
        try {
            await mgr.signoutRedirect();
        } catch {
            await mgr.removeUser();
            await persistor.purge();
            window.location.href = "/login";
        }
    }, [mgr, isBackend, authInfo, dispatch]);

    const handleSignIn = useCallback(async () => {
        if (isBackend) {
            window.location.href = authInfo?.login_url || "/api/auth/oidc/login";
            return;
        }
        if (!mgr) {
            window.location.href = "/login";
            return;
        }
        try {
            await mgr.signinRedirect();
        } catch (err) {
            console.error("[AuthButton] signinRedirect failed:", err);
            setLoginError(err instanceof Error ? err.message : String(err));
        }
    }, [mgr, isBackend, authInfo]);

    const handleProfileClick = useCallback(() => {
        sessionStorage.removeItem('df_logged_in');
        window.location.href = "/login";
    }, []);

    if (identity?.type === "user") {
        const label = String(identity.displayName || identity.id || '');
        return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
                <Tooltip title={label}>
                    <IconButton
                        size="small"
                        onClick={handleProfileClick}
                        sx={{
                            color: "#ffffff",
                            width: 32,
                            height: 32,
                            "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                        }}
                    >
                        <AccountCircleOutlinedIcon sx={{ fontSize: 24 }} />
                    </IconButton>
                </Tooltip>
                {(mgr || isBackend) && (
                    <Tooltip title={t("auth.signOut")}>
                        <IconButton
                            size="small"
                            onClick={handleSignOut}
                            sx={{ color: "#ffffff", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}
                        >
                            <LogoutIcon sx={{ fontSize: iconVar.lg }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        );
    }

    if (initError) {
        return (
            <Tooltip title={`SSO Error: ${initError}`}>
                <Box sx={{ display: "flex", alignItems: "center", ml: 1, color: "error.main" }}>
                    <ErrorOutlineIcon sx={{ fontSize: iconVar.lg, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontSize: textVar.sm, color: "#ffffff" }}>
                        SSO Error
                    </Typography>
                </Box>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={t("auth.account", { defaultValue: "Account" })}>
            <IconButton
                size="small"
                onClick={handleSignIn}
                sx={{
                    ml: 1,
                    color: "#ffffff",
                    width: 32,
                    height: 32,
                    "&:hover": { color: "#ffffff", bgcolor: "rgba(255,255,255,0.12)" },
                }}
            >
                <AccountCircleOutlinedIcon sx={{ fontSize: 24 }} />
            </IconButton>
        </Tooltip>
    );
};
