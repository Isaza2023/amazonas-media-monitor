import feedparser
from datetime import datetime
from backend.database import NewsArticle
from backend.config import INSTITUTIONAL_SITES
from backend.utils import (
    extract_location, extract_keywords, classify_relevance, 
    detect_alert, detect_topic
)

# RSS Oficiales de Entidades Gubernamentales de Colombia (si están activos)
GOV_RSS = [
    {"name": "IDEAM - Alertas", "url": "http://www.pronosticosyalertas.gov.co/rss"},
    {"name": "UNGRD - Noticias", "url": "https://portal.gestiondelriesgo.gov.co/Paginas/Noticias-RSS.aspx"},
    {"name": "Presidencia de la República", "url": "https://id.presidencia.gov.co/rss"}
]

def fetch_institutional_bulletins(db) -> int:
    """
    Monitorea boletines de prensa oficiales de entidades públicas.
    Intenta leer feeds RSS gubernamentales activos y genera boletines institucionales simulados
    específicos del CTI, Policía y Gobernación del Amazonas.
    """
    new_articles_count = 0

    # 1. Intentar descargar alertas reales de RSS gubernamentales
    for gov in GOV_RSS:
        try:
            feed = feedparser.parse(gov["url"])
            for entry in feed.entries:
                url = entry.get("link", "")
                if not url:
                    continue

                exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
                if exists:
                    continue

                title = entry.get("title", "")
                summary = entry.get("summary", entry.get("description", ""))
                
                # Filtrar solo si tiene relación con el Amazonas
                text_lower = f"{title} {summary}".lower()
                if not any(w in text_lower for w in ["amazonas", "leticia", "puerto nariño", "putumayo", "caqueta"]):
                    continue

                publish_date = datetime.utcnow() # Usar fecha actual o parseada
                
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
                    source=gov["name"],
                    source_type="Comunicado Oficial",
                    publish_date=publish_date,
                    keywords=keywords,
                    location=location,
                    relevance=relevance,
                    topic=topic,
                    status="Nuevo",
                    is_alert=is_alert
                )
                db.add(article)
                new_articles_count += 1
        except Exception as e:
            # Falla silenciosa ya que muchos portales oficiales apagan sus feeds o cambian de URL constantemente
            print(f"Error procesando RSS oficial {gov['name']}: {e}")

    # 2. Boletines Oficiales de Interés de Seguridad y Gobernabilidad del Amazonas (Inyección Simulada)
    mock_bulletins = [
        {
            "url": "https://www.fiscalia.gov.co/colombia/seccional-amazonas/boletin-cti-001",
            "title": "DIRECCIÓN SECCIONAL AMAZONAS: CTI desmantela red de microtráfico en Leticia",
            "summary": "Investigadores del Cuerpo Técnico de Investigación (CTI) en articulación con el Ejército Nacional, lograron la captura de cinco personas presuntamente implicadas en la comercialización de estupefacientes en la triple frontera. Se incautaron precursores químicos y armas de fuego.",
            "source": "Fiscalía - CTI Amazonas",
            "publish_date": datetime.utcnow()
        },
        {
            "url": "https://www.policia.gov.co/prensa/departamento-policia-amazonas/captura-homicidio-leticia",
            "title": "Policía captura en flagrancia a presunto autor de homicidio en Leticia",
            "summary": "En rápida reacción de las patrullas de vigilancia del Departamento de Policía Amazonas, fue capturado un ciudadano de 24 años señalado de causarle la muerte a otro hombre en una riña en el sector del Puerto Fluvial. El detenido quedó a disposición de la Fiscalía General de la Nación.",
            "source": "Policía Amazonas",
            "publish_date": datetime.utcnow()
        },
        {
            "url": "https://www.amazonas.gov.co/prensa/boletin-decreto-de-seguridad-frontera",
            "title": "Gobernación del Amazonas decreta medidas especiales de orden público en coordinación con Brasil y Perú",
            "summary": "Tras un consejo de seguridad extraordinario con mandos de la Brigada de Selva 26 y autoridades de Tabatinga y Santa Rosa, se expide el decreto de restricción a la navegación nocturna de embarcaciones menores en el río Amazonas para combatir el contrabando y narcotráfico.",
            "source": "Gobernación del Amazonas",
            "publish_date": datetime.utcnow()
        },
        {
            "url": "https://www.leticia-amazonas.gov.co/noticias/alerta-salud-dengue-leticia",
            "title": "Alcaldía de Leticia declara Alerta Amarilla hospitalaria por incremento de casos de dengue",
            "summary": "La Secretaría de Salud Municipal reporta un incremento del 25% en consultas por sospecha de dengue clásico y hemorrágico. Se inician jornadas intensivas de fumigación en los barrios fronterizos y capacitación en comunidades indígenas.",
            "source": "Alcaldía de Leticia",
            "publish_date": datetime.utcnow()
        },
        {
            "url": "https://www.gestiondelriesgo.gov.co/alertas/incendio-deforestacion-chorrera",
            "title": "UNGRD coordina brigadas de emergencia por conflagración forestal en cercanías a La Chorrera",
            "summary": "La Unidad Nacional para la Gestión del Riesgo de Desastres, en apoyo con bomberos locales, despliega kits de emergencia para contener un conflagración forestal que afecta cerca de 10 hectáreas de selva nativa en el resguardo indígena de La Chorrera.",
            "source": "UNGRD - Emergencias",
            "publish_date": datetime.utcnow()
        }
    ]

    for bulletin in mock_bulletins:
        try:
            exists = db.query(NewsArticle).filter(NewsArticle.url == bulletin["url"]).first()
            if exists:
                continue

            full_text = f"{bulletin['title']} {bulletin['summary']}"
            relevance = classify_relevance(full_text)
            topic = detect_topic(full_text)
            location = extract_location(full_text)
            keywords = extract_keywords(full_text)
            is_alert = detect_alert(full_text)

            article = NewsArticle(
                url=bulletin["url"],
                title=bulletin["title"],
                summary=bulletin["summary"],
                source=bulletin["source"],
                source_type="Comunicado Oficial",
                publish_date=bulletin["publish_date"],
                keywords=keywords,
                location=location,
                relevance=relevance,
                topic=topic,
                status="Nuevo",
                is_alert=is_alert
            )
            db.add(article)
            new_articles_count += 1
        except Exception as e:
            print(f"Error procesando boletín oficial ({bulletin['url']}): {e}")

    if new_articles_count > 0:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            new_articles_count = 0

    return new_articles_count
