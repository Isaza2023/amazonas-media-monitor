import feedparser
import re
from datetime import datetime
from backend.config import RSS_FEEDS, SEARCH_KEYWORDS
from backend.database import NewsArticle
from backend.utils import (
    clean_html, normalize_date, extract_location, extract_keywords, 
    classify_relevance, detect_alert, detect_topic
)

def is_relevant_to_amazonas(title: str, summary: str) -> bool:
    """Verifica si el artículo tiene relación con el Amazonas colombiano o zonas de influencia."""
    text = f"{title} {summary}".lower()
    
    # Lista de palabras clave obligatorias para validar relevancia local (si es de feed general)
    local_check = [
        "amazonas", "leticia", "puerto nariño", "tabatinga", "santa rosa", 
        "iquitos", "triple frontera", "rio amazonas", "la pedrera", "tarapaca",
        "chorrera", "mirití", "puerto arica", "el encanto"
    ]
    
    return any(word in text for word in local_check)

def parse_google_title(title_raw: str):
    """Separa el título original y el medio emisor de Google News RSS."""
    # Google News añade ' - Medio' al final
    parts = title_raw.rsplit(" - ", 1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return title_raw, "Google News"

def fetch_rss_news(db) -> int:
    """
    Descarga artículos desde feeds RSS de Google News y medios generales.
    Retorna el número de artículos nuevos insertados.
    """
    new_articles_count = 0

    # 1. Monitoreo de Google News RSS (búsquedas ya filtradas por keyword)
    for feed_url in RSS_FEEDS["google_news"]:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries:
                url = entry.get("link", "")
                if not url:
                    continue
                
                try:
                    # Evitar duplicados rápidos en DB
                    exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
                    if exists:
                        continue
                    
                    title_raw = entry.get("title", "")
                    title, source = parse_google_title(title_raw)
                    summary = clean_html(entry.get("description", ""))
                    publish_date = normalize_date(entry.get("published", ""))
                    
                    if not is_relevant_to_amazonas(title, summary):
                        continue

                    full_text = f"{title} {summary}"
                    relevance = classify_relevance(full_text)
                    topic = detect_topic(full_text)
                    location = extract_location(full_text)
                    keywords = extract_keywords(full_text)
                    is_alert = detect_alert(full_text)

                    article = NewsArticle(
                        url=url,
                        title=title,
                        summary=summary,
                        source=source,
                        source_type="Noticia",
                        publish_date=publish_date,
                        keywords=keywords,
                        location=location,
                        relevance=relevance,
                        topic=topic,
                        status="Nuevo",
                        is_alert=is_alert
                    )
                    db.add(article)
                    db.commit()
                    new_articles_count += 1
                except Exception as inner_e:
                    db.rollback()
                    # Ignorar silenciosamente errores de llave duplicada
                    if "UNIQUE constraint failed" not in str(inner_e):
                        print(f"Error guardando noticia individual de Google News: {inner_e}")
        except Exception as e:
            print(f"Error procesando Google News RSS ({feed_url}): {e}")

    # 2. Monitoreo de Medios Nacionales
    for feed_info in RSS_FEEDS["medios_nacionales"]:
        try:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries:
                url = entry.get("link", "")
                if not url:
                    continue

                try:
                    exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
                    if exists:
                        continue

                    title = entry.get("title", "")
                    summary = clean_html(entry.get("description", entry.get("summary", "")))
                    publish_date = normalize_date(entry.get("published", ""))

                    if not is_relevant_to_amazonas(title, summary):
                        continue

                    full_text = f"{title} {summary}"
                    relevance = classify_relevance(full_text)
                    topic = detect_topic(full_text)
                    location = extract_location(full_text)
                    keywords = extract_keywords(full_text)
                    is_alert = detect_alert(full_text)

                    article = NewsArticle(
                        url=url,
                        title=title,
                        summary=summary,
                        source=feed_info["name"],
                        source_type="Noticia",
                        publish_date=publish_date,
                        keywords=keywords,
                        location=location,
                        relevance=relevance,
                        topic=topic,
                        status="Nuevo",
                        is_alert=is_alert
                    )
                    db.add(article)
                    db.commit()
                    new_articles_count += 1
                except Exception as inner_e:
                    db.rollback()
                    if "UNIQUE constraint failed" not in str(inner_e):
                        print(f"Error guardando noticia nacional de RSS: {inner_e}")
        except Exception as e:
            print(f"Error procesando Medio Nacional RSS ({feed_info['name']}): {e}")

    # 3. Monitoreo de Medios e Instituciones de Frontera (Brasil y Perú)
    for feed_info in RSS_FEEDS["medios_frontera"]:
        try:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries:
                url = entry.get("link", "")
                if not url:
                    continue

                try:
                    exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
                    if exists:
                        continue

                    title = entry.get("title", "")
                    summary = clean_html(entry.get("description", entry.get("summary", "")))
                    publish_date = normalize_date(entry.get("published", ""))

                    if not is_relevant_to_amazonas(title, summary):
                        continue

                    full_text = f"{title} {summary}"
                    relevance = classify_relevance(full_text)
                    topic = detect_topic(full_text)
                    location = extract_location(full_text)
                    keywords = extract_keywords(full_text)
                    is_alert = detect_alert(full_text)

                    article = NewsArticle(
                        url=url,
                        title=title,
                        summary=summary,
                        source=feed_info["name"],
                        source_type="Noticia",
                        publish_date=publish_date,
                        keywords=keywords,
                        location=location,
                        relevance=relevance,
                        topic=topic,
                        status="Nuevo",
                        is_alert=is_alert
                    )
                    db.add(article)
                    db.commit()
                    new_articles_count += 1
                except Exception as inner_e:
                    db.rollback()
                    if "UNIQUE constraint failed" not in str(inner_e):
                        print(f"Error guardando noticia frontera de RSS: {inner_e}")
        except Exception as e:
            print(f"Error procesando Medio Frontera RSS ({feed_info['name']}): {e}")

    return new_articles_count
