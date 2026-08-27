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
 * Export the dashboard element as a beautifully aligned, printable PDF
 */
export async function downloadDashboardPdf(
    element: HTMLElement,
    title: string,
    filterContext?: string
): Promise<void> {
    // 1. Render high-res canvas of the entire dashboard
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const cleanTitle = sanitizeFileName(title);
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // 2. Build isolated print iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    try {
        const doc = printFrame.contentDocument;
        const win = printFrame.contentWindow;
        if (!doc || !win) {
            throw new Error('Could not open print window.');
        }

        doc.open();
        doc.write(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${cleanTitle}</title>
    <style>
        @page {
            size: portrait;
            margin: 0mm;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        *, *::before, *::after {
            box-sizing: border-box !important;
        }
        html, body {
            margin: 0;
            padding: 12mm 15mm;
            background: #ffffff;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0f172a;
            width: 100%;
        }
        .header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 0 10px 0;
            margin-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
        }
        .header-title {
            font-size: 16px;
            font-weight: 700;
            color: #001d52;
        }
        .header-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }
        .canvas-container {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }
        .canvas-img {
            width: 100%;
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            display: block;
        }
    </style>
</head>
<body>
    <div class="header-bar">
        <div>
            <div class="header-title">${title || 'Intelligence Hub Dashboard'}</div>
            ${filterContext ? `<div class="header-meta">Scope Filter: ${filterContext}</div>` : ''}
        </div>
    </div>
    <div class="canvas-container">
        <img class="canvas-img" src="${dataUrl}" alt="Dashboard snapshot" />
    </div>
</body>
</html>`);
        doc.close();

        win.onafterprint = () => {
            setTimeout(() => {
                try {
                    if (printFrame.parentNode) {
                        printFrame.remove();
                    }
                } catch (_) {}
            }, 1500);
        };

        // Long fallback cleanup (5 minutes)
        setTimeout(() => {
            try {
                if (printFrame.parentNode) {
                    printFrame.remove();
                }
            } catch (_) {}
        }, 300000);

        await new Promise((resolve) => setTimeout(resolve, 800));

        win.focus();
        win.print();
    } catch (err) {
        console.error('Failed to export PDF:', err);
        try {
            if (printFrame.parentNode) {
                printFrame.remove();
            }
        } catch (_) {}
        throw err;
    }
}
