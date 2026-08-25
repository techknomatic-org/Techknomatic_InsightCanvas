// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { apiRequest } from '../../app/apiClient';
import {
    DataProfile,
    DashboardSuggestion,
    DashboardSpec,
    IntelligenceSession,
    ChatMessage,
} from './intelligenceTypes';

export const INTELLIGENCE_URLS = {
    PROFILE: '/api/intelligence/profile',
    SUGGESTIONS: '/api/intelligence/suggestions',
    GENERATE_DASHBOARD: '/api/intelligence/generate-dashboard',
    QUERY_FILTER: '/api/intelligence/query-filter',
    CHAT: '/api/intelligence/chat',
    SESSIONS: '/api/intelligence/sessions',
    SAVE_SESSION: '/api/intelligence/sessions/save',
    DELETE_SESSION: (id: string) => `/api/intelligence/sessions/${id}`,
    GET_SESSION: (id: string) => `/api/intelligence/sessions/${id}`,
};

export async function profileTables(tables: string[], connectorId?: string, workspaceId?: string): Promise<DataProfile> {
    const res = await apiRequest<{ profile: DataProfile }>(INTELLIGENCE_URLS.PROFILE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
        },
        body: JSON.stringify({ tables, connector_id: connectorId, workspace_id: workspaceId }),
    });
    return res.data.profile;
}

export async function fetchSuggestions(
    profile: DataProfile,
    model?: any
): Promise<DashboardSuggestion[]> {
    const res = await apiRequest<{ suggestions: DashboardSuggestion[] }>(
        INTELLIGENCE_URLS.SUGGESTIONS,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, model }),
        }
    );
    return res.data.suggestions || [];
}

export async function generateDashboard(
    profile: DataProfile,
    prompt: string,
    model?: any
): Promise<DashboardSpec> {
    const res = await apiRequest<{ dashboard: DashboardSpec }>(
        INTELLIGENCE_URLS.GENERATE_DASHBOARD,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, prompt, model }),
        }
    );
    return res.data.dashboard;
}

export async function queryDashboardFilter(
    dashboard: DashboardSpec,
    filterValue: string | number
): Promise<DashboardSpec> {
    const res = await apiRequest<{ dashboard: DashboardSpec }>(
        INTELLIGENCE_URLS.QUERY_FILTER,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dashboard, filter_value: filterValue }),
        }
    );
    return res.data.dashboard;
}

export async function sendChatMessage(
    currentDashboard: DashboardSpec,
    message: string,
    profile?: DataProfile,
    history?: ChatMessage[],
    model?: any
): Promise<{ reply: string; dashboard: DashboardSpec }> {
    const res = await apiRequest<{ reply: string; dashboard: DashboardSpec }>(
        INTELLIGENCE_URLS.CHAT,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_dashboard: currentDashboard,
                message,
                profile,
                history,
                model,
            }),
        }
    );
    return res.data;
}

export async function listSessions(): Promise<IntelligenceSession[]> {
    const res = await apiRequest<{ sessions: IntelligenceSession[] }>(
        INTELLIGENCE_URLS.SESSIONS,
        { method: 'GET' }
    );
    return res.data.sessions || [];
}

export async function loadSessionDetail(id: string): Promise<IntelligenceSession> {
    const res = await apiRequest<{ session: IntelligenceSession }>(
        INTELLIGENCE_URLS.GET_SESSION(id),
        { method: 'GET' }
    );
    return res.data.session;
}

export async function saveSession(sessionData: Partial<IntelligenceSession>): Promise<IntelligenceSession> {
    const res = await apiRequest<{ session: IntelligenceSession }>(
        INTELLIGENCE_URLS.SAVE_SESSION,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData),
        }
    );
    return res.data.session;
}

export async function deleteSession(id: string): Promise<void> {
    await apiRequest<{ deleted: boolean }>(INTELLIGENCE_URLS.DELETE_SESSION(id), {
        method: 'DELETE',
    });
}
