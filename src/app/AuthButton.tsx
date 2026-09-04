import React, { FC, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    SxProps,
    Theme,
    Tooltip,
    Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
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

export interface AuthButtonProps {
    id?: string;
    tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
    anchorOrigin?: {
        vertical: 'top' | 'center' | 'bottom';
        horizontal: 'left' | 'center' | 'right';
    };
    transformOrigin?: {
        vertical: 'top' | 'center' | 'bottom';
        horizontal: 'left' | 'center' | 'right';
    };
    buttonSx?: SxProps<Theme>;
}

export const AuthButton: FC<AuthButtonProps> = ({
    id,
    tooltipPlacement = 'bottom',
    anchorOrigin = { vertical: 'bottom', horizontal: 'right' },
    transformOrigin = { vertical: 'top', horizontal: 'right' },
    buttonSx,
}) => {
    const { t } = useTranslation();
    const dispatch = useDispatch<AppDispatch>();
    const identity = useSelector((s: DataFormulatorState) => s.identity);
    const [mgr, setMgr] = useState<UserManager | null>(null);
    const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const isMenuOpen = Boolean(anchorEl);

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

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleSignOut = useCallback(async () => {
        handleCloseMenu();
        sessionStorage.removeItem('df_logged_in');
        localStorage.removeItem('df_logged_in');
        dispatch(dfActions.resetState());
        dispatch(dfActions.setDataSourceSidebarOpen(false));
        await persistor.purge();
        const browserId = getBrowserId();
        dispatch(dfActions.setIdentity({ type: "browser", id: browserId }));
        localStorage.setItem("df_identity_type", "browser");
        localStorage.setItem("df_browser_id", browserId);

        if (isBackend) {
            try {
                await apiRequest(authInfo?.logout_url || "/api/auth/oidc/logout", { method: "POST" });
            } catch {
                // Ignore failure on logout call
            }
            window.location.href = "/login";
            return;
        }

        if (!mgr) {
            window.location.href = "/login";
            return;
        }

        try {
            await mgr.signoutRedirect();
        } catch {
            await mgr.removeUser();
            window.location.href = "/login";
        }
    }, [mgr, isBackend, authInfo, dispatch]);

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
        <>
            <Tooltip title={t("auth.account", { defaultValue: "Account" })} placement={tooltipPlacement}>
                <IconButton
                    id={id}
                    size="small"
                    onClick={handleOpenMenu}
                    aria-controls={isMenuOpen ? "account-profile-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen ? "true" : undefined}
                    sx={{
                        color: "#ffffff",
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        bgcolor: isMenuOpen ? "rgba(255,255,255,0.2)" : "transparent",
                        "&:hover": {
                            bgcolor: isMenuOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
                            color: "#ffffff",
                        },
                        ...buttonSx,
                    }}
                >
                    <AccountCircleOutlinedIcon sx={{ fontSize: 22 }} />
                </IconButton>
            </Tooltip>

            <Menu
                id="account-profile-menu"
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleCloseMenu}
                onClick={(e) => e.stopPropagation()}
                anchorOrigin={anchorOrigin}
                transformOrigin={transformOrigin}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            mt: 1,
                            minWidth: 230,
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                            border: '1px solid rgba(226, 232, 240, 0.9)',
                            bgcolor: '#ffffff',
                            p: 0,
                            overflow: 'visible',
                        },
                    },
                }}
            >
                {/* User Info Header */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                        sx={{
                            width: 38,
                            height: 38,
                            bgcolor: '#1B75BB',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14px',
                            boxShadow: '0 2px 6px rgba(27, 117, 187, 0.35)',
                        }}
                    >
                        KS
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            sx={{
                                fontWeight: 600,
                                fontSize: '13.5px',
                                color: '#0f172a',
                                lineHeight: 1.25,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            Krishna Shelar
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'inline-flex', alignItems: 'center' }}>
                            <Box
                                sx={{
                                    px: 0.9,
                                    py: 0.2,
                                    bgcolor: 'rgba(27, 117, 187, 0.08)',
                                    border: '1px solid rgba(27, 117, 187, 0.22)',
                                    borderRadius: '4px',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        color: '#1B75BB',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        lineHeight: 1,
                                    }}
                                >
                                    Role- Admin
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(226, 232, 240, 0.8)', my: 0.5 }} />

                {/* Logout Action */}
                <MenuItem
                    onClick={handleSignOut}
                    sx={{
                        py: 1.2,
                        px: 2,
                        gap: 1.25,
                        color: '#dc2626',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                            bgcolor: 'rgba(220, 38, 38, 0.06)',
                            color: '#b91c1c',
                        },
                    }}
                >
                    <LogoutIcon sx={{ fontSize: 18, color: 'inherit' }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'inherit' }}>
                        Log out
                    </Typography>
                </MenuItem>
            </Menu>
        </>
    );
};
