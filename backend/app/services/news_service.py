from __future__ import annotations
from typing import Any
import feedparser
import requests
from bs4 import BeautifulSoup


RSS_SOURCES = [
    "https://news.google.com/rss/search?q={q}",
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
]


def fetch_news(query: str, limit: int = 8) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    query = (query or "").strip()
    if not query:
        return items

    for src in RSS_SOURCES:
        url = src.format(q=requests.utils.quote(query))
        feed = feedparser.parse(url)
        for e in feed.entries:
            items.append({
                "title": getattr(e, "title", ""),
                "link": getattr(e, "link", ""),
                "published": getattr(e, "published", ""),
                "summary": getattr(e, "summary", ""),
                "source": getattr(getattr(e, "source", None), "title", "") or src,
            })
            if len(items) >= limit:
                return items
    return items[:limit]


def crawl_extract(url: str, timeout: int = 12) -> dict[str, Any]:
    resp = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "noscript", "header", "footer", "svg"]):
        tag.decompose()

    title = (soup.title.string.strip() if soup.title and soup.title.string else "")
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    text = "\n".join([p for p in paragraphs if p])

    return {
        "url": url,
        "title": title,
        "text": text[:50000],
        "length": len(text),
    }
