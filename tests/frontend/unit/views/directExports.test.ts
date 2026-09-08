// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '../../../../src/views/IntelligenceHub/dashboardExport';

describe('BI Hub Direct Document Exporters & Sanitizers', () => {
    it('sanitizes filenames correctly for exports', () => {
        expect(sanitizeFileName('Manufacturing / Operations: Dashboard?*')).toBe('Manufacturing Operations Dashboard');
        expect(sanitizeFileName('Sales & Revenue (Q1-2026)')).toBe('Sales & Revenue (Q1-2026)');
        expect(sanitizeFileName('   spaced  name   ')).toBe('spaced name');
        expect(sanitizeFileName('')).toBe('Dashboard');
    });
});
