// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import html2canvas from 'html2canvas';
import { sanitizeFileName } from './dashboardExport';

/**
 * Generate and download a standard multi-page PDF directly (no print popups/dialogs)
 */
export interface DirectPdfExportOptions {
    ignoreSelectors?: string[];
    onBeforeCapture?: (clonedElement: HTMLElement) => void;
}

/**
 * Generate and download a standard multi-page PDF directly (no print popups/dialogs)
 */
export async function downloadElementAsDirectPdf(
    element: HTMLElement,
    baseName: string,
    options?: DirectPdfExportOptions
): Promise<void> {
    const totalElementHeight = Math.max(element.scrollHeight, element.offsetHeight, Math.round(element.getBoundingClientRect().height));
    const totalElementWidth = Math.max(element.scrollWidth, element.offsetWidth, 816);

    // 1. Capture high-resolution raster of the target element
    const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: totalElementWidth,
        height: totalElementHeight,
        windowWidth: Math.max(totalElementWidth, 1024),
        windowHeight: Math.max(totalElementHeight, 768),
        ignoreElements: (el) => {
            if (el.hasAttribute('data-report-toolbar')) return true;
            if (el.classList.contains('resize-handle')) return true;
            if (options?.ignoreSelectors?.some((sel) => el.matches(sel))) return true;
            return false;
        },
        onclone: (_clonedDoc, clonedElement) => {
            let parent = clonedElement.parentElement;
            while (parent && parent !== _clonedDoc.body) {
                parent.scrollTop = 0;
                parent.scrollLeft = 0;
                parent = parent.parentElement;
            }
            clonedElement.querySelectorAll('[data-report-toolbar]').forEach((el) => el.remove());
            clonedElement.querySelectorAll('.resize-handle').forEach((el) => el.remove());
            clonedElement.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
            const tiptap = clonedElement.querySelector('.tiptap');
            if (tiptap instanceof HTMLElement) {
                tiptap.style.outline = 'none';
            }
            if (options?.onBeforeCapture) {
                options.onBeforeCapture(clonedElement);
            }
        },
    });

    const pdfBlob = await createPdfBlobFromCanvas(canvas, element);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${sanitizeFileName(baseName)}-${dateStr}.pdf`;

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface PageSlice {
    sy: number;
    sh: number;
}

/**
 * Compute smart, element-aware page break slices to ensure no text line,
 * paragraph, heading, KPI card, or chart card is sliced horizontally across pages.
 */
function computeSmartPageSlices(canvas: HTMLCanvasElement, element: HTMLElement): PageSlice[] {
    // Standard A4 aspect ratio (height / width ≈ 1.4142)
    const a4Ratio = 841.89 / 595.28;
    const slicePixelWidth = canvas.width;
    const idealPageHeightPx = Math.floor(slicePixelWidth * a4Ratio);

    const rootRect = element.getBoundingClientRect();
    const scaleY = canvas.height / (element.scrollHeight || rootRect.height || 1);

    // Select candidate block elements for break avoidance
    const breakSelectors = [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'li',
        'blockquote',
        'table',
        'tr',
        'pre',
        'hr',
        'img',
        'figure',
        '[data-node-view-wrapper]',
        '.report-kpi-card',
        '.report-kpi-grid-container',
        '.report-chart-card',
        '.report-visuals-grid-container',
    ];

    const candidateNodes = Array.from(element.querySelectorAll(breakSelectors.join(','))) as HTMLElement[];

    // Map elements to canvas pixel coordinates
    const elementBounds = candidateNodes
        .map((node) => {
            const rect = node.getBoundingClientRect();
            const top = (rect.top - rootRect.top) * scaleY;
            const bottom = (rect.bottom - rootRect.top) * scaleY;
            const height = bottom - top;
            const tagName = node.tagName.toLowerCase();
            const isHeading = tagName.startsWith('h');
            const isCard =
                node.classList.contains('report-kpi-card') ||
                node.classList.contains('report-chart-card') ||
                node.hasAttribute('data-node-view-wrapper') ||
                tagName === 'tr' ||
                tagName === 'table' ||
                tagName === 'img' ||
                tagName === 'figure' ||
                tagName === 'pre';
            return { node, top, bottom, height, tagName, isHeading, isCard };
        })
        .filter((item) => item.height > 2 && item.bottom > 0)
        .sort((a, b) => a.top - b.top);

    const slices: PageSlice[] = [];
    let currentY = 0;
    const totalHeight = canvas.height;

    // Safety padding at page bottom so content never touches the bottom edge (approx 40px scaled)
    const bottomPaddingPx = Math.floor(36 * (slicePixelWidth / 1024));
    const maxContentHeightPerPage = idealPageHeightPx - bottomPaddingPx;

    while (currentY < totalHeight) {
        const remainingHeight = totalHeight - currentY;

        // If remaining content fits cleanly on this final page
        if (remainingHeight <= maxContentHeightPerPage) {
            slices.push({
                sy: Math.floor(currentY),
                sh: Math.min(totalHeight - currentY, idealPageHeightPx),
            });
            break;
        }

        const targetCutY = currentY + maxContentHeightPerPage;
        let bestCutY = targetCutY;

        // Check if any element is crossed by the targetCutY cut line
        const crossedElement = elementBounds.find(
            (el) => el.top < targetCutY && el.bottom > targetCutY
        );

        if (crossedElement) {
            const cutBefore = crossedElement.top;
            // If cutting before this element leaves at least 40% of the page filled, cut cleanly before it
            if (cutBefore > currentY + maxContentHeightPerPage * 0.4) {
                bestCutY = cutBefore;
            } else {
                // If the element is exceptionally large, look for a nested breakable child within it
                const nestedChild = elementBounds.find(
                    (el) => el.top > currentY + maxContentHeightPerPage * 0.5 && el.top < targetCutY
                );
                if (nestedChild) {
                    bestCutY = nestedChild.top;
                } else {
                    bestCutY = targetCutY;
                }
            }
        } else {
            // Avoid leaving an orphan heading alone at the very bottom of a page
            const orphanHeading = elementBounds.find(
                (el) => el.isHeading && el.top > targetCutY - Math.floor(60 * (slicePixelWidth / 1024)) && el.top <= targetCutY
            );
            if (orphanHeading && orphanHeading.top > currentY + maxContentHeightPerPage * 0.4) {
                bestCutY = orphanHeading.top;
            }
        }

        const sliceHeight = Math.max(120, Math.floor(bestCutY - currentY));
        slices.push({
            sy: Math.floor(currentY),
            sh: sliceHeight,
        });

        currentY += sliceHeight;
    }

    return slices;
}

/**
 * Convert a canvas into a standard multi-page PDF 1.4 binary Blob with smart element-aware pagination
 */
async function createPdfBlobFromCanvas(canvas: HTMLCanvasElement, element: HTMLElement): Promise<Blob> {
    // A4 dimensions in PDF points (72 points/inch)
    const pageWidthPt = 595.28;
    const pageHeightPt = 841.89;
    const a4Ratio = pageHeightPt / pageWidthPt; // ~1.4142

    const slicePixelWidth = canvas.width;
    const idealSliceHeight = Math.floor(slicePixelWidth * a4Ratio);

    const slices = computeSmartPageSlices(canvas, element);
    const imageBlobs: { width: number; height: number; bytes: Uint8Array }[] = [];

    for (let p = 0; p < slices.length; p++) {
        const slice = slices[p];

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = slicePixelWidth;
        pageCanvas.height = idealSliceHeight;
        const pCtx = pageCanvas.getContext('2d');
        if (!pCtx) continue;

        // Solid crisp white background
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, slicePixelWidth, idealSliceHeight);

        // Draw the cleanly sliced portion
        pCtx.drawImage(
            canvas,
            0,
            slice.sy,
            slicePixelWidth,
            slice.sh,
            0,
            0,
            slicePixelWidth,
            slice.sh
        );

        const blob = await new Promise<Blob | null>((res) =>
            pageCanvas.toBlob((b) => res(b), 'image/jpeg', 0.94)
        );

        if (blob) {
            const buf = await blob.arrayBuffer();
            imageBlobs.push({
                width: slicePixelWidth,
                height: idealSliceHeight,
                bytes: new Uint8Array(buf),
            });
        }
    }

    if (imageBlobs.length === 0) {
        throw new Error('Failed to generate image pages for PDF.');
    }

    return assemblePdfDocument(imageBlobs, pageWidthPt, pageHeightPt);
}

/**
 * Pure TypeScript PDF 1.4 Binary Assembler
 */
function assemblePdfDocument(
    pages: { width: number; height: number; bytes: Uint8Array }[],
    pageWidth: number,
    pageHeight: number
): Blob {
    const chunks: BlobPart[] = [];
    const offsets: number[] = [];
    let currentOffset = 0;

    const pushString = (str: string) => {
        const enc = new TextEncoder().encode(str);
        chunks.push(enc.buffer as ArrayBuffer);
        currentOffset += enc.length;
    };

    const pushBytes = (bytes: Uint8Array) => {
        chunks.push(bytes.buffer as ArrayBuffer);
        currentOffset += bytes.length;
    };

    // 1. PDF Header
    pushString('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const totalPages = pages.length;
    // Objects:
    // Obj 1: Catalog
    // Obj 2: Pages root
    // For each page i (0 to totalPages - 1):
    //   Obj 3 + 3*i + 0: Page object
    //   Obj 3 + 3*i + 1: Contents stream
    //   Obj 3 + 3*i + 2: Image XObject

    // Obj 1: Catalog
    offsets[1] = currentOffset;
    pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages root
    const pageObjRefs = pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ');
    offsets[2] = currentOffset;
    pushString(`2 0 obj\n<< /Type /Pages /Kids [${pageObjRefs}] /Count ${totalPages} >>\nendobj\n`);

    for (let i = 0; i < totalPages; i++) {
        const pageObjNum = 3 + 3 * i;
        const contentObjNum = pageObjNum + 1;
        const imageObjNum = pageObjNum + 2;
        const img = pages[i];

        // Content stream: scale image to full A4 page
        const contentStreamText = `q\n${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
        const contentStreamBytes = new TextEncoder().encode(contentStreamText);

        // Page Object
        offsets[pageObjNum] = currentOffset;
        pushString(
            `${pageObjNum} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}]\n  /Contents ${contentObjNum} 0 R\n  /Resources <<\n    /ProcSet [/PDF /ImageC]\n    /XObject << /Im${i + 1} ${imageObjNum} 0 R >>\n  >>\n>>\nendobj\n`
        );

        // Content Stream Object
        offsets[contentObjNum] = currentOffset;
        pushString(
            `${contentObjNum} 0 obj\n<< /Length ${contentStreamBytes.length} >>\nstream\n`
        );
        pushBytes(contentStreamBytes);
        pushString('\nendstream\nendobj\n');

        // Image XObject
        offsets[imageObjNum] = currentOffset;
        pushString(
            `${imageObjNum} 0 obj\n<<\n  /Type /XObject\n  /Subtype /Image\n  /Width ${img.width}\n  /Height ${img.height}\n  /ColorSpace /DeviceRGB\n  /BitsPerComponent 8\n  /Filter /DCTDecode\n  /Length ${img.bytes.length}\n>>\nstream\n`
        );
        pushBytes(img.bytes);
        pushString('\nendstream\nendobj\n');
    }

    // Cross-reference table (xref)
    const totalObjs = 2 + 3 * totalPages;
    const startXref = currentOffset;
    pushString(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
    for (let o = 1; o <= totalObjs; o++) {
        const off = offsets[o] || 0;
        const offStr = String(off).padStart(10, '0');
        pushString(`${offStr} 00000 n \n`);
    }

    // Trailer
    pushString(
        `trailer\n<<\n  /Size ${totalObjs + 1}\n  /Root 1 0 R\n>>\nstartxref\n${startXref}\n%%EOF\n`
    );

    return new Blob(chunks, { type: 'application/pdf' });
}
