from pathlib import Path

from app.pdf import render_pdf

edition = {
    "date": "2022-07-12",
    "articles": [
        {
            "headline": "A new window into the universe",
            "summary": "The first full-color images from the James Webb Space Telescope reveal a universe of extraordinary detail. From stellar nurseries to distant galaxies, the observations open a new chapter in infrared astronomy.",
            "category": "Science & discovery",
            "source": "NASA",
            "url": "https://www.nasa.gov/news-release/nasa-reveals-webb-telescopes-first-images-of-unseen-universe/",
        },
        {
            "headline": "A headline long enough to test the newspaper’s wrapping and spacing across the printed page",
            "summary": "Source-grounded summaries retain links to the original publication. " * 25,
            "category": "Further reading",
            "source": "Example fixture",
            "url": "https://example.com/fixture",
        },
    ],
}
output = Path("../tmp/pdfs")
output.mkdir(parents=True, exist_ok=True)
(output / "daybreak-layout-check.pdf").write_bytes(render_pdf(edition))
