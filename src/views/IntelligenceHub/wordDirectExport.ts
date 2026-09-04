// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import { DashboardSpec, KpiSpec } from './intelligenceTypes';
import { sanitizeFileName } from './dashboardExport';

/**
 * Download an executive intelligence report as a styled Microsoft Word (.docx) document
 */
export function downloadReportAsWordDocx(
    markdownContent: string,
    reportTitle: string,
    dashboard?: DashboardSpec
): void {
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const kpis: KpiSpec[] = dashboard?.kpis || [];

    // Build KPI Summary Table in HTML
    let kpiHtml = '';
    if (kpis.length > 0) {
        const kpiRows = kpis
            .map(
                (k) => `
            <tr>
                <td style="padding: 8pt 10pt; border: 1pt solid #cbd5e1; font-weight: bold; color: #001d52;">${escapeHtml(k.title)}</td>
                <td style="padding: 8pt 10pt; border: 1pt solid #cbd5e1; font-weight: bold; color: #1B75BB; font-size: 13pt;">${escapeHtml(String(k.formatted_value || k.raw_value || '—'))}</td>
                <td style="padding: 8pt 10pt; border: 1pt solid #cbd5e1; color: #64748b; font-size: 9.5pt;">${escapeHtml(k.subtitle || `${k.aggregation || 'SUM'} of ${k.measure_column || ''}`)}</td>
            </tr>`
            )
            .join('');

        kpiHtml = `
        <h2 style="font-size: 14pt; color: #001d52; margin-top: 18pt; margin-bottom: 8pt; border-left: 4pt solid #1B75BB; padding-left: 6pt;">
            Key Performance Indicators (KPIs)
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16pt; font-family: 'Calibri', 'Arial', sans-serif;">
            <thead>
                <tr style="background-color: #f1f5f9;">
                    <th style="padding: 8pt 10pt; border: 1pt solid #cbd5e1; text-align: left; font-size: 10.5pt; color: #1e293b;">Metric</th>
                    <th style="padding: 8pt 10pt; border: 1pt solid #cbd5e1; text-align: left; font-size: 10.5pt; color: #1e293b;">Value</th>
                    <th style="padding: 8pt 10pt; border: 1pt solid #cbd5e1; text-align: left; font-size: 10.5pt; color: #1e293b;">Context / Aggregation</th>
                </tr>
            </thead>
            <tbody>
                ${kpiRows}
            </tbody>
        </table>`;
    }

    // Convert Markdown content into Word-compliant HTML
    const convertedHtml = convertMarkdownToWordHtml(markdownContent);

    // Full Word-compatible document structure
    const wordDocumentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>${escapeHtml(reportTitle)}</title>
        <!--[if gte mso 9]>
        <xml>
            <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
            @page {
                size: A4;
                margin: 1.0in 1.0in 1.0in 1.0in;
                mso-header-margin: 0.5in;
                mso-footer-margin: 0.5in;
            }
            body {
                font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
                font-size: 11pt;
                line-height: 1.6;
                color: #1e293b;
                background-color: #ffffff;
            }
            .report-title-box {
                border-bottom: 2.5pt solid #1B75BB;
                padding-bottom: 8pt;
                margin-bottom: 16pt;
            }
            .report-main-title {
                font-size: 22pt;
                font-weight: bold;
                color: #001d52;
                margin: 0 0 4pt 0;
            }
            .report-meta-subtitle {
                font-size: 10pt;
                color: #64748b;
                margin: 0;
            }
            h1 {
                font-size: 16pt;
                color: #001d52;
                margin-top: 18pt;
                margin-bottom: 6pt;
                border-bottom: 1pt solid #e2e8f0;
                padding-bottom: 4pt;
                page-break-after: avoid;
            }
            h2 {
                font-size: 13.5pt;
                color: #1e293b;
                margin-top: 16pt;
                margin-bottom: 6pt;
                border-left: 3.5pt solid #1B75BB;
                padding-left: 6pt;
                page-break-after: avoid;
            }
            h3 {
                font-size: 12pt;
                color: #334155;
                margin-top: 12pt;
                margin-bottom: 4pt;
                page-break-after: avoid;
            }
            p {
                margin: 0 0 8pt 0;
                color: #334155;
            }
            ul, ol {
                margin: 0 0 10pt 0;
                padding-left: 20pt;
            }
            li {
                margin-bottom: 4pt;
                color: #334155;
            }
            blockquote {
                background-color: #f0f9ff;
                border-left: 3.5pt solid #0ea5e9;
                margin: 10pt 0;
                padding: 8pt 12pt;
                color: #0369a1;
                font-size: 10.5pt;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 12pt 0;
                font-size: 10pt;
            }
            th, td {
                border: 1pt solid #cbd5e1;
                padding: 6pt 8pt;
                text-align: left;
            }
            th {
                background-color: #f8fafc;
                font-weight: bold;
                color: #1e293b;
            }
            strong {
                color: #0f172a;
            }
        </style>
    </head>
    <body>
        <div class="report-title-box">
            <h1 class="report-main-title">${escapeHtml(reportTitle)}</h1>
            <p class="report-meta-subtitle">InsightCanvas BI Hub | Executive Strategy Briefing &bull; Generated on ${dateStr}</p>
        </div>

        ${kpiHtml}

        <div>
            ${convertedHtml}
        </div>
    </body>
    </html>
    `;

    const blob = new Blob(['\ufeff', wordDocumentHtml], {
        type: 'application/vnd.ms-word;charset=utf-8',
    });

    const cleanTitle = sanitizeFileName(reportTitle) || 'Executive-Report';
    const dateStrFile = new Date().toISOString().slice(0, 10);
    const fileName = `${cleanTitle}-${dateStrFile}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function convertMarkdownToWordHtml(md: string): string {
    const lines = md.split('\n');
    let html = '';
    let inList = false;
    let inTable = false;
    let tableRows: string[][] = [];

    const closeList = () => {
        if (inList) {
            html += '</ul>\n';
            inList = false;
        }
    };

    const flushTable = () => {
        if (tableRows.length === 0) return;
        html += '<table style="width: 100%; border-collapse: collapse; margin: 12pt 0;">\n';
        tableRows.forEach((row, rIdx) => {
            const tag = rIdx === 0 ? 'th' : 'td';
            const bg = rIdx === 0 ? ' style="background-color: #f8fafc; font-weight: bold;"' : '';
            html += `  <tr>\n${row.map((cell) => `    <${tag}${bg} style="border: 1pt solid #cbd5e1; padding: 6pt 8pt;">${formatInlineMarkdown(cell)}</${tag}>\n`).join('')}  </tr>\n`;
        });
        html += '</table>\n';
        tableRows = [];
        inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line || line === '---' || line === '***') {
            closeList();
            if (inTable) flushTable();
            continue;
        }

        // Table row
        if (line.startsWith('|') && line.endsWith('|')) {
            closeList();
            if (/^\|[\s\-:|]+\|$/.test(line)) {
                continue;
            }
            inTable = true;
            const cells = line
                .slice(1, -1)
                .split('|')
                .map((c) => c.trim());
            tableRows.push(cells);
            continue;
        } else if (inTable) {
            flushTable();
        }

        // Headings
        if (line.startsWith('# ')) {
            closeList();
            html += `<h1>${formatInlineMarkdown(line.replace(/^#\s+/, ''))}</h1>\n`;
        } else if (line.startsWith('## ')) {
            closeList();
            html += `<h2>${formatInlineMarkdown(line.replace(/^##\s+/, ''))}</h2>\n`;
        } else if (line.startsWith('### ')) {
            closeList();
            html += `<h3>${formatInlineMarkdown(line.replace(/^###\s+/, ''))}</h3>\n`;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) {
                html += '<ul>\n';
                inList = true;
            }
            html += `  <li>${formatInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>\n`;
        } else if (line.startsWith('>')) {
            closeList();
            html += `<blockquote>${formatInlineMarkdown(line.replace(/^>\s*/, ''))}</blockquote>\n`;
        } else {
            closeList();
            html += `<p>${formatInlineMarkdown(line)}</p>\n`;
        }
    }

    closeList();
    if (inTable) flushTable();

    return html;
}

function formatInlineMarkdown(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background-color: #f1f5f9; padding: 2pt 4pt; border-radius: 3pt; font-family: Consolas, monospace;">$1</code>');
}
