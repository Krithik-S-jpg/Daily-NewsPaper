import pytest

from app.connectors import normalize_feed
from app.editorial import Extractive, compose
from app.models import Preferences


def feed(body):
    return normalize_feed(
        f"""<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
    <image><url>https://publisher.example/logo.jpg</url></image>
    <item><title>News report</title><link>https://publisher.example/news/report</link>
    {body}</item></channel></rss>""".encode(),
        {"name": "Publisher", "id": "source"},
    )[0]


async def test_article_image_and_credit_survive_composition():
    item = feed(
        '<media:content medium="image" url="https://cdn.example/report.jpg?size=large"/><media:credit>Photo: Jane Smith</media:credit>'
    )
    assert str(item.image) == "https://cdn.example/report.jpg?size=large"
    assert item.image_caption == "Photo: Jane Smith"
    article = (await compose([item], Preferences(), Extractive()))[0]
    assert article.image == item.image
    assert article.model_dump(mode="json")["image_caption"] == "Photo: Jane Smith"


def test_embedded_relative_image_and_no_feed_logo_fallback():
    item = feed('<description><![CDATA[<img src="/photos/report.jpg" alt="The scene"/>]]></description>')
    assert str(item.image) == "https://publisher.example/photos/report.jpg"
    assert item.image_caption == "The scene · Image supplied by Publisher"
    assert feed("<description>No image supplied</description>").image is None


@pytest.mark.parametrize(
    "url",
    [
        "http://cdn.example/a.jpg",
        "https://127.0.0.1/a.jpg",
        "https://user:pass@cdn.example/a.jpg",
        "javascript:alert(1)",
        "https://host.local/a.jpg",
    ],
)
def test_unsafe_image_urls_are_omitted(url):
    assert feed(f'<media:thumbnail url="{url}"/>').image is None
