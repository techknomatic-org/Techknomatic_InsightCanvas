// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import html2canvas from 'html2canvas';

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFileName(name: string): string {
    return (
        name
            .replace(/[\\/:*?"<>|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[. ]+$/g, '')
            .slice(0, 80) || 'Dashboard'
    );
}

/**
 * Capture an HTML element and download it as an Image (JPG or PNG)
 */
export async function downloadDashboardImage(
    element: HTMLElement,
    baseName: string,
    format: 'jpg' | 'png' = 'jpg'
): Promise<void> {
    const isJpg = format === 'jpg';
    const mimeType = isJpg ? 'image/jpeg' : 'image/png';
    const extension = isJpg ? 'jpg' : 'png';
    const quality = isJpg ? 0.95 : 1.0;

    // Use html2canvas with high DPI
    const canvas = await html2canvas(element, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), mimeType, quality)
    );

    if (!blob) {
        throw new Error('Failed to generate image from dashboard canvas.');
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${sanitizeFileName(baseName)}-${dateStr}.${extension}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export the dashboard element as a clean, directly downloaded PDF
 */
export async function downloadDashboardPdf(
    element: HTMLElement,
    title: string,
    filterContext?: string
): Promise<void> {
    const { downloadElementAsDirectPdf } = await import('./pdfDirectExport');
    await downloadElementAsDirectPdf(element, title || 'BI Hub Dashboard');
}

