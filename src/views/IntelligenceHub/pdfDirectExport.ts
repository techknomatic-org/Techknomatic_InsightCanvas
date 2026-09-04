// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import html2canvas from 'html2canvas';
import { sanitizeFileName } from './dashboardExport';

/**
 * Generate and download a standard multi-page PDF directly (no print popups/dialogs)
 */
export async function downloadElementAsDirectPdf(
    element: HTMLElement,
    baseName: string
): Promise<void> {
    // 1. Capture high-resolution raster of the target element
    const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1024,
    });

    const pdfBlob = await createPdfBlobFromCanvas(canvas);
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

/**
 * Convert a canvas into a standard multi-page PDF 1.4 binary Blob with embedded JPEG streams
 */
async function createPdfBlobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    // A4 dimensions in PDF points (72 points/inch)
    const pageWidthPt = 595.28;
    const pageHeightPt = 841.89;
    const a4Ratio = pageHeightPt / pageWidthPt; // ~1.4142

    const slicePixelWidth = canvas.width;
    const slicePixelHeight = Math.floor(slicePixelWidth * a4Ratio);

    const totalHeight = canvas.height;
    const pageCount = Math.max(1, Math.ceil(totalHeight / slicePixelHeight));

    const imageBlobs: { width: number; height: number; bytes: Uint8Array }[] = [];

    for (let p = 0; p < pageCount; p++) {
        const sy = p * slicePixelHeight;
        const sh = Math.min(slicePixelHeight, totalHeight - sy);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = slicePixelWidth;
        pageCanvas.height = slicePixelHeight;
        const pCtx = pageCanvas.getContext('2d');
        if (!pCtx) continue;

        // White background
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, slicePixelWidth, slicePixelHeight);

        // Draw slice
        pCtx.drawImage(
            canvas,
            0,
            sy,
            slicePixelWidth,
            sh,
            0,
            0,
            slicePixelWidth,
            sh
        );

        const blob = await new Promise<Blob | null>((res) =>
            pageCanvas.toBlob((b) => res(b), 'image/jpeg', 0.92)
        );

        if (blob) {
            const buf = await blob.arrayBuffer();
            imageBlobs.push({
                width: slicePixelWidth,
                height: slicePixelHeight,
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
