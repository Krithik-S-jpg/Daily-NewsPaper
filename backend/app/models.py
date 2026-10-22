from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, HttpUrl, field_validator


class Preferences(BaseModel):
    topics: list[str] = Field(default_factory=lambda: ["Science"], max_length=30)
    length: Literal["Quick Brief", "Daily Edition", "Deep Read"] = "Daily Edition"
    tone: Literal["Balanced", "Concise", "Analytical"] = "Balanced"
    language: Literal["English"] = "English"
    theme: Literal["Classic"] = "Classic"
    time: str = Field(default="07:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: str = "Asia/Kolkata"
    email: bool = False
    delivery_format: Literal["link", "pdf", "both"] = "link"
    days: list[int] = Field(default_factory=lambda: list(range(7)), max_length=7)

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Use an IANA timezone, for example Asia/Kolkata") from exc
        return value

    @field_validator("days")
    @classmethod
    def valid_days(cls, value):
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Days must be between 0 and 6")
        return sorted(set(value))

    @field_validator("topics")
    @classmethod
    def valid_topics(cls, value):
        cleaned = list(dict.fromkeys(t.strip() for t in value if t.strip()))
        if any(len(t) > 80 for t in cleaned):
            raise ValueError("Topics must be at most 80 characters")
        return cleaned


class SourceInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: Literal["rss", "github", "youtube", "reddit"]
    url: str = Field(min_length=1, max_length=2048)


class SourcePatch(BaseModel):
    enabled: bool


class Item(BaseModel):
    id: str
    headline: str = Field(min_length=1, max_length=500)
    summary: str = Field(max_length=12000)
    category: str = "Further reading"
    source: str
    url: HttpUrl
    published_at: datetime | None = None
    source_id: str = ""
    image: HttpUrl | None = None
    image_caption: str | None = None


class Article(BaseModel):
    id: str
    headline: str
    summary: str
    category: str
    source: str
    url: HttpUrl
    published_at: datetime | None = None
    summary_kind: Literal["source_excerpt", "ai_summary"] = "source_excerpt"
    image: HttpUrl | None = None
    image_caption: str | None = None


class Edition(BaseModel):
    id: str
    date: date
    title: str = "Your daily perspective"
    articles: list[Article]


class SummaryOutput(BaseModel):
    summary: str = Field(min_length=1, max_length=1800)


class ReadingPosition(BaseModel):
    mode: Literal["phone", "spread"]
    page: int = Field(ge=0, le=10000)
