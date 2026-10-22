from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer


def render_pdf(edition):
    """Flow structured stories through two A4 columns, without screenshotting the UI."""
    stream = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "Section",
            fontName="Helvetica",
            fontSize=7,
            leading=10,
            textColor=colors.HexColor("#994d36"),
            keepWithNext=True,
            spaceAfter=7,
        )
    )
    styles.add(ParagraphStyle("Headline", fontName="Times-Roman", fontSize=19, leading=22, spaceAfter=10))
    styles.add(ParagraphStyle("Copy", fontName="Times-Roman", fontSize=10.5, leading=15, spaceAfter=10))
    styles.add(ParagraphStyle("Source", fontName="Helvetica", fontSize=7, leading=10, spaceAfter=18))
    width, height = A4
    margin, gutter = 42, 22
    col = (width - 2 * margin - gutter) / 2
    frames = [
        Frame(
            margin,
            48,
            col,
            height - 176,
            id="left",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        ),
        Frame(
            margin + col + gutter,
            48,
            col,
            height - 176,
            id="right",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        ),
    ]

    def furniture(canvas, document):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#292b26"))
        canvas.setFont("Times-Bold", 42)
        canvas.drawCentredString(width / 2, height - 57, "Daybreak")
        canvas.setFont("Helvetica", 7)
        canvas.drawString(margin, height - 81, edition["date"])
        canvas.drawRightString(width - margin, height - 81, "YOUR DAILY PERSPECTIVE")
        canvas.setStrokeColor(colors.HexColor("#555c4c"))
        canvas.line(margin, height - 89, width - margin, height - 89)
        canvas.line(margin, height - 92, width - margin, height - 92)
        canvas.setStrokeColor(colors.HexColor("#dddcd4"))
        canvas.line(width / 2, 48, width / 2, height - 128)
        canvas.setFont("Helvetica", 6.5)
        canvas.drawString(margin, 28, "DAYBREAK · Follow source links for full context")
        canvas.drawRightString(width - margin, 28, str(document.page))
        canvas.restoreState()

    doc = BaseDocTemplate(stream, pagesize=A4, title=f"Daybreak · {edition['date']}", author="Daybreak")
    doc.addPageTemplates(PageTemplate(id="newspaper", frames=frames, onPage=furniture))
    story = []
    for article in edition["articles"]:
        story.append(Paragraph(escape(article["category"].upper()), styles["Section"]))
        story.append(Paragraph(escape(article["headline"]), styles["Headline"]))
        story.append(Paragraph(escape(article["summary"]), styles["Copy"]))
        url = escape(str(article["url"]), {'"': "&quot;"})
        story.append(
            Paragraph(
                f'<link href="{url}" color="#66583e">{escape(article["source"])}</link>', styles["Source"]
            )
        )
    if not story:
        story = [Paragraph("No stories available in this edition.", styles["Copy"]), Spacer(1, 12)]
    doc.build(story)
    return stream.getvalue()
