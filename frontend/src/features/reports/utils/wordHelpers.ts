import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  LevelFormat,
} from 'docx'
import type { IStylesOptions, INumberingOptions, ISectionPropertiesOptions } from 'docx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// US Letter, 1" margins — content width 9360 DXA
export const CONTENT_WIDTH = 9360
export const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
export const CELL_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
}
export const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 }
export const HEADER_FILL = { fill: 'D5E8F0', type: ShadingType.CLEAR }

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export async function downloadDocx(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ---------------------------------------------------------------------------
// Primitive builders
// ---------------------------------------------------------------------------

export function h1(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] })
}

export function h2(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] })
}

export function h3(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] })
}

export function para(text: string, options?: { bold?: boolean; italic?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        italics: options?.italic,
        size: options?.size,
      }),
    ],
  })
}

export function placeholder(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `[${text}]`,
        italics: true,
        color: '888888',
      }),
    ],
  })
}

export function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun('')] })
}

export function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] })
}

// ---------------------------------------------------------------------------
// Table builders
// ---------------------------------------------------------------------------

export function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: HEADER_FILL,
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true })],
      }),
    ],
  })
}

export function dataCell(text: string, width: number): TableCell {
  const parts = (text ?? '').split('\n')
  const children: TextRun[] = parts.flatMap((part, i) =>
    i === 0 ? [new TextRun(part)] : [new TextRun({ break: 1, text: part })]
  )
  return new TableCell({
    borders: CELL_BORDERS,
    width: { size: width, type: WidthType.DXA },
    margins: CELL_MARGINS,
    children: [new Paragraph({ children })],
  })
}

export function buildTable(
  columnWidths: number[],
  headers: string[],
  rows: string[][],
): Table {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, columnWidths[i])),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell, i) => dataCell(cell, columnWidths[i])),
          }),
      ),
    ],
  })
}

// ---------------------------------------------------------------------------
// Document config factories
// ---------------------------------------------------------------------------

export function createDocumentStyles(): IStylesOptions {
  return {
    default: {
      document: { run: { font: 'Arial', size: 22 } }, // 11pt
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: '1F3864' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: '2E74B5' },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '444444' },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 },
      },
    ],
  }
}

export function createNumberingConfig(): INumberingOptions {
  return {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  }
}

export function createPageProperties(): ISectionPropertiesOptions {
  return {
    page: {
      size: { width: 12240, height: 15840 }, // US Letter
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1" margins
    },
  }
}
