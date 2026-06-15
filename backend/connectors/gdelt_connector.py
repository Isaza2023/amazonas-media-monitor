import requests
from datetime import datetime
from backend.database import NewsArticle
from backend.utils import (
    clean_html, extract_location, extract_keywords, 
    classify_relevance, detect_alert, detect_topic
)

def fetch_gdelt_news(db) -> int:
    """
    Realiza una consulta a la API de Documentos de GDELT Project buscando noticias sobre Amazonas/Leticia/Frontera.
    Retorna la cantidad de artículos nuevos guardados.
    """
    new_articles_count = 0
    
    # Query de búsqueda para GDELT
    # Buscamos combinaciones de palabras clave relacionadas con la triple frontera y el Amazonas colombiano
    query = '(Amazonas Colombia OR Leticia OR Puerto Narino OR Tabatinga OR triple frontera OR Iquitos)'
    url = f"https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=ArtList&format=json&maxrecords=50&sort=hybrid"
    
    try:
        response = requests.get(url, timeout=15)
        if response.status_code != 200:
            print(f"Error al conectar con GDELT API. Status: {response.status_code}")
            return 0
            
        data = response.json()
        articles_list = data.get("articles", [])
        
        for art in articles_list:
            art_url = art.get("url", "")
            if not art_url:
                continue
                
            # Evitar duplicados
            exists = db.query(NewsArticle).filter(NewsArticle.url == art_url).first()
            if exists:
                continue
                
            title = art.get("title", "")
            source = art.get("domain", "GDELT Project")
            
            # GDELT no siempre da un resumen, usamos el título como placeholder del summary o descripción
            summary = f"Noticia registrada en GDELT. Fuente original: {source}. Idioma: {art.get('language', 'No especificado')}"
            
            # Formato de fecha de GDELT: YYYYMMDDTHHMMSSZ (ej. 20260615T124500Z)
            seen_date_str = art.get("seendate", "")
            try:
                publish_date = datetime.strptime(seen_date_str, "%Y%m%dT%H%M%SZ")
            except ValueError:
                publish_date = datetime.utcnow()
                
            full_text = f"{title} {summary}"
            relevance = classify_relevance(full_text)
            topic = detect_topic(full_text)
            location = extract_location(full_text)
            keywords = extract_keywords(full_text)
            is_alert = detect_alert(full_text)
            
            # Como GDELT es una base de datos global, validamos que mencione Amazonas, Leticia o zonas relevantes
            # para evitar falsos positivos internacionales irrelevantes (ej. Amazonas de Perú que no afecte a Colombia)
            text_to_check = f"{title} {location}".lower()
            if "amazonas" not in text_to_check and "leticia" not in text_to_check and "frontera" not in text_to_check and "tabatinga" not in text_to_check:
                continue

            article = NewsArticle(
                url=art_url,
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
            new_articles_count += 1
            
        if new_articles_count > 0:
            db.commit()
            
    except Exception as e:
        print(f"Error procesando noticias de GDELT: {e}")
        db.rollback()
        
    return new_articles_count
