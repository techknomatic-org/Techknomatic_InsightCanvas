// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

/**
 * ToolbarActionsContext — allows toolbar actions (settings, model selector,
 * language switcher, etc.) to be rendered in the sidebar instead of (or in
 * addition to) the top nav bar.
 */

import React, { createContext, useContext } from 'react';

export interface ToolbarActionsContextValue {
    /** Open the settings/config dialog with optional tab */
    openSettings?: (tab?: 'models' | 'general' | 'knowledge' | 'logs') => void;
    /** Open the log viewer dialog */
    openLogs?: () => void;
    /** Whether local mode (shows log viewer) */
    isLocalMode?: boolean;
}

export const ToolbarActionsContext = createContext<ToolbarActionsContextValue>({});

export const useToolbarActions = () => useContext(ToolbarActionsContext);
