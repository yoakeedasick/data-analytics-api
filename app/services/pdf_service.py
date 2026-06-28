import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_pdf_report(file_name: str, row_count: int, col_count: int, result_json: dict) -> io.BytesIO:
    buffer = io.BytesIO()

    # 1. Create document with generous margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=50
    )

    story = []

    # 2. Get standard stylesheet
    styles = getSampleStyleSheet()

    # Platform color palette definitions
    c_primary = colors.HexColor('#6A513E')    # Brown Accent
    c_text = colors.HexColor('#2B2927')       # Dark Charcoal
    c_muted = colors.HexColor('#8A7E74')      # Secondary Muted
    c_bg_light = colors.HexColor('#FAF7F2')   # Very Light Cream
    c_border = colors.HexColor('#EAE2D5')     # Border Beige

    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=c_primary,
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=c_muted,
        spaceAfter=20
    )

    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=c_text
    )

    # 3. Title & Generation Date
    story.append(Paragraph("DALYTICS DATA ANALYSIS REPORT", title_style))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%b %d, %Y %I:%M %p')} | Dataset: {file_name}", subtitle_style))

    # 4. Overview Section
    story.append(Paragraph("Dataset Overview", heading_style))

    # Calculate overall integrity percentage
    total_missing = sum(result_json.get("missing_values", {}).values())
    total_cells = row_count * col_count
    integrity_pct = round(((total_cells - total_missing) /
                          total_cells) * 100, 2) if total_cells > 0 else 100.0

    overview_data = [
        [Paragraph("Metadata Field", table_header_style),
         Paragraph("Value", table_header_style)],
        [Paragraph("File Name", table_cell_style),
         Paragraph(file_name, table_cell_style)],
        [Paragraph("Total Records (Rows)", table_cell_style),
         Paragraph(f"{row_count:,}", table_cell_style)],
        [Paragraph("Total Features (Columns)", table_cell_style),
         Paragraph(f"{col_count}", table_cell_style)],
        [Paragraph("Data Integrity (Complete Cells)", table_cell_style),
         Paragraph(f"{integrity_pct}%", table_cell_style)],
        [Paragraph("Total Missing Values", table_cell_style),
         Paragraph(f"{total_missing:,}", table_cell_style)]
    ]

    t_overview = Table(overview_data, colWidths=[200, 330])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
    ]))
    story.append(t_overview)
    story.append(Spacer(1, 10))

    # 5. Column Specifications Table
    story.append(
        Paragraph("Column Specifications & Data Quality", heading_style))
    col_specs_data = [
        [
            Paragraph("Column Name", table_header_style),
            Paragraph("Data Type", table_header_style),
            Paragraph("Missing Count", table_header_style),
            Paragraph("Missing %", table_header_style)
        ]
    ]

    column_names = result_json.get("column_names", [])
    dtypes = result_json.get("dtypes", {})
    missing_values = result_json.get("missing_values", {})
    missing_pct = result_json.get("missing_pct", {})

    for col in column_names:
        dtype = dtypes.get(col, "unknown")
        m_count = missing_values.get(col, 0)
        m_pct = missing_pct.get(col, 0.0)
        col_specs_data.append([
            Paragraph(col, table_cell_style),
            Paragraph(dtype, table_cell_style),
            Paragraph(f"{m_count:,}" if m_count >
                      0 else "0", table_cell_style),
            Paragraph(f"{m_pct}%" if m_count > 0 else "0.0%", table_cell_style)
        ])

    t_specs = Table(col_specs_data, colWidths=[180, 110, 120, 120])
    t_specs.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
    ]))
    story.append(t_specs)
    story.append(Spacer(1, 10))

    # 6. Descriptive Statistics Table (Numeric Only)
    describe_data = result_json.get("describe", {})
    if describe_data:
        story.append(
            Paragraph("Descriptive Statistics (Numeric Features)", heading_style))
        stats_list = ["count", "mean", "std", "min", "50%", "max"]

        describe_headers = [Paragraph("Feature / Column", table_header_style)]
        for s in stats_list:
            describe_headers.append(
                Paragraph(s.upper() if s != "50%" else "MEDIAN", table_header_style))

        describe_table_data = [describe_headers]
        for col, stats in describe_data.items():
            row_cells = [Paragraph(col, table_cell_style)]
            for s in stats_list:
                val = stats.get(s, None)
                val_str = f"{val:,.2f}" if val is not None else "N/A"
                row_cells.append(Paragraph(val_str, table_cell_style))
            describe_table_data.append(row_cells)

        t_describe = Table(describe_table_data, colWidths=[146] + [64] * 6)
        t_describe.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_primary),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ]))
        story.append(t_describe)
        story.append(Spacer(1, 10))

    # 7. Correlation Matrix Heatmap Table (Numeric Only)
    correlation = result_json.get("correlation", {})
    if correlation:
        story.append(Paragraph("Pearson Correlation Matrix", heading_style))
        corr_cols = list(correlation.keys())

        corr_headers = [Paragraph("Feature", table_header_style)]
        for col in corr_cols:
            corr_headers.append(Paragraph(col, table_header_style))

        corr_table_data = [corr_headers]
        for col in corr_cols:
            row_cells = [Paragraph(col, table_cell_style)]
            for other_col in corr_cols:
                val = correlation.get(col, {}).get(other_col, None)
                val_str = f"{val:.2f}" if val is not None else "1.00"
                row_cells.append(Paragraph(val_str, table_cell_style))
            corr_table_data.append(row_cells)

        num_corr_cols = len(corr_cols)
        first_col_width = 110
        rem_width = 420 / num_corr_cols if num_corr_cols > 0 else 420

        t_corr = Table(corr_table_data, colWidths=[
                       first_col_width] + [rem_width] * num_corr_cols)
        t_corr.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_primary),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ]))
        story.append(t_corr)

    # 8. Build Document & Setup Page Footer Callback
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(c_muted)
        canvas.drawString(
            40, 25, "Dalytics Platform — Automated Statistical Analysis Report")
        canvas.drawRightString(doc.pagesize[0] - 40, 25, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)

    buffer.seek(0)
    return buffer
