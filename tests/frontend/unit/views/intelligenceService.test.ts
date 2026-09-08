// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClient from '../../../../src/app/apiClient';
import {
    profileTables,
    fetchSuggestions,
    generateDashboard,
    queryDashboardFilter,
    sendChatMessage,
    generateExecutiveReport,
    listSessions,
    loadSessionDetail,
    saveSession,
} from '../../../../src/views/IntelligenceHub/intelligenceService';

describe('intelligenceService - API Client Unit Tests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('profileTables sends POST to /api/intelligence/profile', async () => {
        const mockProfile = { tables: [{ table_name: 'sales', row_count: 100 }], table_count: 1 };
        vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
            data: { profile: mockProfile },
            status: 200,
        } as any);

        const result = await profileTables(['sales'], 'conn_1', 'ws_1');
        expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/intelligence/profile', expect.objectContaining({
            method: 'POST',
        }));
        expect(result.table_count).toBe(1);
    });

    it('queryDashboardFilter posts dashboard spec and filter value', async () => {
        const mockDashboard = { title: 'Factory KPI', kpis: [], visualizations: [] } as any;
        vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
            data: { dashboard: { ...mockDashboard, filter: { selected_value: 'Bengaluru Plant' } } },
            status: 200,
        } as any);

        const result = await queryDashboardFilter(mockDashboard, 'Bengaluru Plant');
        expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/intelligence/query-filter', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ dashboard: mockDashboard, filter_value: 'Bengaluru Plant' }),
        }));
        expect(result.filter?.selected_value).toBe('Bengaluru Plant');
    });

    it('saveSession sends POST to /api/intelligence/sessions/save', async () => {
        const mockSession = { id: 'sess_123', title: 'Test Session', pinned: true } as any;
        vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
            data: { session: mockSession },
            status: 200,
        } as any);

        const result = await saveSession(mockSession);
        expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/intelligence/sessions/save', expect.objectContaining({
            method: 'POST',
        }));
        expect(result.id).toBe('sess_123');
    });
});
