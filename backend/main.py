import os
import io
import threading
import time
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func

from backend.database import init_db, get_db, NewsArticle, ApiKeyConfig
from backend.config import PORT, HOST
from backend.utils import (
    normalize_date, extract_location, extract_keywords, 
    classify_relevance, detect_alert, detect_topic
)

# Importar conectores
from backend.connectors.rss_connector import fetch_rss_news
from backend.connectors.gdelt_connector import fetch_gdelt_news
from backend.connectors.youtube_connector import fetch_youtube_videos
from backend.connectors.social_connector import fetch_social_media
from backend.connectors.institutional_connector import fetch_institutional_bulletins

# Importar generador de reportes
from backend.report_generator import (
    generate_csv_report, generate_json_report, generate_excel_report,
    generate_docx_report, generate_pdf_report
)

# Inicializar Base de Datos
init_db()

# Inicializar FastAPI
app = FastAPI(
    title="Amazonas Media Monitor API",
    description="Backend de Monitoreo de Medios e Inteligencia de Fuentes Abiertas para el Amazonas",
    version="1.0.0"
)

# Configurar CORS para permitir peticiones del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Variables del Planificador en Segundo Plano ---
UPDATE_INTERVAL_MINUTES = 15  # Intervalo de actualización por defecto
stop_scheduler = False
scheduler_thread = None
last_fetch_time = datetime.now()
is_fetching = False

def update_all_sources(db: Session) -> dict:
    """Ejecuta todos los conectores secuencialmente."""
    global last_fetch_time, is_fetching
    is_fetching = True
    results = {}
    try:
        results["google_news_rss"] = fetch_rss_news(db)
        results["gdelt_project"] = fetch_gdelt_news(db)
        results["youtube"] = fetch_youtube_videos(db)
        results["social_media"] = fetch_social_media(db)
        results["institutional"] = fetch_institutional_bulletins(db)
        results["total_new"] = sum(results.values())
        last_fetch_time = datetime.now()
    except Exception as e:
        print(f"Error durante la actualización general: {e}")
        results["error"] = str(e)
        results["total_new"] = 0
    finally:
        is_fetching = False
    return results

def run_scheduler():
    """Bucle infinito para el hilo secundario de actualización automática."""
    global stop_scheduler, UPDATE_INTERVAL_MINUTES
    print("Hilo de actualización automática iniciado.")
    # Espera inicial para no bloquear el arranque
    time.sleep(10)
    
    while not stop_scheduler:
        try:
            from backend.database import SessionLocal
            db = SessionLocal()
            print(f"[{datetime.now()}] Iniciando descarga automática periódica...")
            update_all_sources(db)
            db.close()
        except Exception as e:
            print(f"Error en hilo de actualización programada: {e}")
            
        # Espera pasiva (1 segundo a la vez para poder reaccionar al apagado del servidor rápidamente)
        for _ in range(UPDATE_INTERVAL_MINUTES * 60):
            if stop_scheduler:
                break
            time.sleep(1)

@app.on_event("startup")
def startup_event():
    global scheduler_thread, stop_scheduler
    stop_scheduler = False
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    global stop_scheduler
    stop_scheduler = True
    print("Deteniendo planificador de actualización automática...")

# --- Esquemas de Datos Pydantic ---
class ArticleUpdate(BaseModel):
    relevance: Optional[str] = None
    topic: Optional[str] = None
    status: Optional[str] = None
    analyst_notes: Optional[str] = None
    analysis_preliminary: Optional[str] = None
    regional_impact: Optional[str] = None
    elaborated_by: Optional[str] = None
    location: Optional[str] = None

class ArticleCreate(BaseModel):
    title: str
    url: str
    summary: Optional[str] = ""
    source: str
    source_type: str  # Noticia, Red Social, Comunicado Oficial, Video, Boletin
    publish_date: Optional[str] = None  # ISO format or YYYY-MM-DD
    relevance: Optional[str] = "BAJA"
    topic: Optional[str] = "General"
    location: Optional[str] = "General"
    analyst_notes: Optional[str] = ""

class ConfigUpdate(BaseModel):
    YOUTUBE_API_KEY: Optional[str] = None
    X_BEARER_TOKEN: Optional[str] = None
    FACEBOOK_ACCESS_TOKEN: Optional[str] = None
    INSTAGRAM_ACCESS_TOKEN: Optional[str] = None

class ExportRequest(BaseModel):
    ids: List[int]
    format: str  # pdf, word, excel, csv, json

# --- Endpoints del API REST ---

@app.get("/api/status")
def get_system_status():
    """Retorna el estado de las descargas en segundo plano."""
    return {
        "last_update": last_fetch_time.strftime('%Y-%m-%d %H:%M:%S'),
        "is_fetching": is_fetching,
        "update_interval_minutes": UPDATE_INTERVAL_MINUTES
    }

@app.post("/api/status/interval")
def set_update_interval(minutes: int = Query(..., gt=0)):
    """Ajusta el tiempo de recarga automática en minutos."""
    global UPDATE_INTERVAL_MINUTES
    UPDATE_INTERVAL_MINUTES = minutes
    return {"message": f"Intervalo actualizado a {minutes} minutos"}

@app.post("/api/fetch")
def trigger_manual_fetch(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Ejecuta una actualización manual en segundo plano para no bloquear al usuario."""
    global is_fetching
    if is_fetching:
        return {"status": "running", "message": "El monitoreo ya se está ejecutando."}
    
    background_tasks.add_task(update_all_sources, db)
    return {"status": "started", "message": "Actualización de fuentes iniciada en segundo plano."}

@app.get("/api/articles")
def get_articles(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Búsqueda por palabra clave en título/resumen"),
    source: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    relevance: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    limit: int = 100,
    offset: int = 0
):
    """Consulta la base de datos de artículos con múltiples filtros aplicados."""
    query = db.query(NewsArticle)
    
    if search:
        search_filter = or_(
            NewsArticle.title.ilike(f"%{search}%"),
            NewsArticle.summary.ilike(f"%{search}%"),
            NewsArticle.analyst_notes.ilike(f"%{search}%"),
            NewsArticle.keywords.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
        
    if source:
        query = query.filter(NewsArticle.source == source)
    if source_type:
        query = query.filter(NewsArticle.source_type == source_type)
    if location:
        query = query.filter(NewsArticle.location == location)
    if topic:
        query = query.filter(NewsArticle.topic == topic)
    if relevance:
        query = query.filter(NewsArticle.relevance == relevance)
    if status:
        query = query.filter(NewsArticle.status == status)
    else:
        # Por defecto no mostrar los artículos descartados en la feed principal a menos que se filtre
        query = query.filter(NewsArticle.status != "Descartado")
        
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(NewsArticle.publish_date >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(NewsArticle.publish_date < end_dt)
        except ValueError:
            pass
            
    # Ordenar por fecha de publicación descendente
    query = query.order_by(desc(NewsArticle.publish_date))
    
    total = query.count()
    articles = query.offset(offset).limit(limit).all()
    
    # Contar cuántos artículos en estado "Nuevo" hay en total
    new_count = db.query(NewsArticle).filter(NewsArticle.status == "Nuevo").count()
    
    return {
        "total": total,
        "new_count": new_count,
        "articles": articles
    }

@app.get("/api/articles/{art_id}")
def get_article(art_id: int, db: Session = Depends(get_db)):
    """Obtiene una noticia específica."""
    article = db.query(NewsArticle).filter(NewsArticle.id == art_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return article

@app.post("/api/articles")
def create_article(article_in: ArticleCreate, db: Session = Depends(get_db)):
    """Permite el ingreso manual de un boletín o novedad por parte del analista."""
    # Validar si ya existe la URL
    exists = db.query(NewsArticle).filter(NewsArticle.url == article_in.url).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un artículo con este enlace/código.")
        
    pub_date = normalize_date(article_in.publish_date) if article_in.publish_date else datetime.utcnow()
    
    full_text = f"{article_in.title} {article_in.summary}"
    keywords = extract_keywords(full_text)
    
    # Si ingresa manualmente, asignamos las categorías automáticas pero permitimos que persistan las del formulario
    relevance = article_in.relevance or classify_relevance(full_text)
    topic = article_in.topic or detect_topic(full_text)
    location = article_in.location or extract_location(full_text)
    is_alert = detect_alert(full_text)
    
    article = NewsArticle(
        url=article_in.url,
        title=article_in.title,
        summary=article_in.summary,
        source=article_in.source,
        source_type=article_in.source_type,
        publish_date=pub_date,
        keywords=keywords,
        location=location,
        relevance=relevance,
        topic=topic,
        status="Nuevo",
        is_alert=is_alert,
        analyst_notes=article_in.analyst_notes
    )
    
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

@app.put("/api/articles/{art_id}")
def update_article(art_id: int, update_data: ArticleUpdate, db: Session = Depends(get_db)):
    """Actualiza campos editados por el analista (relevancia, estado, notas)."""
    article = db.query(NewsArticle).filter(NewsArticle.id == art_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
        
    data = update_data.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(article, key, value)
        
    db.commit()
    db.refresh(article)
    return article

@app.delete("/api/articles/{art_id}")
def delete_article(art_id: int, db: Session = Depends(get_db)):
    """Cambia el estado de una noticia a 'Descartado' en lugar de borrarla físicamente."""
    article = db.query(NewsArticle).filter(NewsArticle.id == art_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
        
    article.status = "Descartado"
    db.commit()
    return {"message": "Artículo descartado exitosamente"}

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db), limit: int = 15):
    """Devuelve las alertas críticas de seguridad más recientes."""
    alerts = db.query(NewsArticle)\
        .filter(and_(NewsArticle.is_alert == True, NewsArticle.status != "Descartado"))\
        .order_by(desc(NewsArticle.publish_date))\
        .limit(limit)\
        .all()
    return alerts

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Genera datos agregados para los gráficos interactivos del dashboard."""
    # Filtro general para no incluir descartados en métricas
    base_query = db.query(NewsArticle).filter(NewsArticle.status != "Descartado")
    
    # 1. Noticias por día (últimos 15 días)
    day_format = func.strftime('%Y-%m-%d', NewsArticle.publish_date)
    news_by_day = base_query.with_entities(day_format, func.count(NewsArticle.id))\
        .group_by(day_format)\
        .order_by(day_format)\
        .limit(15)\
        .all()
        
    # 2. Noticias por fuente (Top 10)
    news_by_source = base_query.with_entities(NewsArticle.source, func.count(NewsArticle.id))\
        .group_by(NewsArticle.source)\
        .order_by(desc(func.count(NewsArticle.id)))\
        .limit(10)\
        .all()
        
    # 3. Noticias por tema
    news_by_topic = base_query.with_entities(NewsArticle.topic, func.count(NewsArticle.id))\
        .group_by(NewsArticle.topic)\
        .all()
        
    # 4. Noticias por relevancia
    news_by_relevance = base_query.with_entities(NewsArticle.relevance, func.count(NewsArticle.id))\
        .group_by(NewsArticle.relevance)\
        .all()
        
    # 5. Menciones por municipio o zona
    news_by_location = base_query.with_entities(NewsArticle.location, func.count(NewsArticle.id))\
        .group_by(NewsArticle.location)\
        .all()
        
    # 6. Alertas críticas recientes (conteo)
    total_alerts = base_query.filter(NewsArticle.is_alert == True).count()
    
    # 7. Palabras clave más repetidas (parsing simple)
    keywords_list = base_query.with_entities(NewsArticle.keywords).filter(NewsArticle.keywords != "").all()
    kw_counts = {}
    for row in keywords_list:
        if row[0]:
            kws = [k.strip() for k in row[0].split(",") if k.strip()]
            for kw in kws:
                kw_counts[kw] = kw_counts.get(kw, 0) + 1
    sorted_kws = sorted(kw_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "by_day": [{"day": r[0], "count": r[1]} for r in news_by_day],
        "by_source": [{"source": r[0], "count": r[1]} for r in news_by_source],
        "by_topic": [{"topic": r[0], "count": r[1]} for r in news_by_topic],
        "by_relevance": [{"relevance": r[0], "count": r[1]} for r in news_by_relevance],
        "by_location": [{"location": r[0], "count": r[1]} for r in news_by_location],
        "top_keywords": [{"keyword": r[0], "count": r[1]} for r in sorted_kws],
        "total_alerts": total_alerts
    }

@app.get("/api/config")
def get_config(db: Session = Depends(get_db)):
    """Obtiene la configuración de las llaves API (enmascaradas para seguridad)."""
    configs = db.query(ApiKeyConfig).all()
    masked_configs = {}
    for c in configs:
        val = c.key_value or ""
        # Enmascarar llave si tiene contenido
        if val and len(val) > 8:
            masked_configs[c.key_name] = f"{val[:4]}...{val[-4:]}"
        else:
            masked_configs[c.key_name] = "No configurada"
    return masked_configs

@app.post("/api/config")
def update_config(configs_in: ConfigUpdate, db: Session = Depends(get_db)):
    """Guarda y actualiza los tokens o llaves API en base de datos."""
    data = configs_in.dict(exclude_unset=True)
    for k_name, k_val in data.items():
        if k_val is not None:
            config = db.query(ApiKeyConfig).filter(ApiKeyConfig.key_name == k_name).first()
            if config:
                config.key_value = k_val.strip()
            else:
                db.add(ApiKeyConfig(key_name=k_name, key_value=k_val.strip()))
    db.commit()
    return {"message": "Configuración guardada exitosamente"}

@app.post("/api/export")
def export_articles(request: ExportRequest, db: Session = Depends(get_db)):
    """Exporta las noticias seleccionadas en los formatos Excel, CSV, JSON, Word y PDF."""
    if not request.ids:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos una noticia para exportar.")
        
    articles = db.query(NewsArticle).filter(NewsArticle.id.in_(request.ids)).all()
    if not articles:
        raise HTTPException(status_code=404, detail="No se encontraron las noticias seleccionadas.")
        
    # Convertir modelos SQLAlchemy a diccionarios
    serialized = []
    for art in articles:
        d = {
            "id": art.id,
            "title": art.title,
            "url": art.url,
            "summary": art.summary,
            "source": art.source,
            "source_type": art.source_type,
            "publish_date": art.publish_date,
            "keywords": art.keywords,
            "location": art.location,
            "relevance": art.relevance,
            "topic": art.topic,
            "status": art.status,
            "analyst_notes": art.analyst_notes,
            "analysis_preliminary": art.analysis_preliminary,
            "regional_impact": art.regional_impact,
            "elaborated_by": art.elaborated_by,
            "is_alert": art.is_alert
        }
        serialized.append(d)
        
    fmt = request.format.lower()
    
    if fmt == "csv":
        data_bytes = generate_csv_report(serialized)
        filename = f"Reporte_Monitoreo_Amazonas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        media_type = "text/csv"
    elif fmt == "json":
        data_bytes = generate_json_report(serialized)
        filename = f"Reporte_Monitoreo_Amazonas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        media_type = "application/json"
    elif fmt == "excel":
        data_bytes = generate_excel_report(serialized)
        filename = f"Reporte_Monitoreo_Amazonas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif fmt == "word":
        data_bytes = generate_docx_report(serialized)
        filename = f"Reporte_Flash_CTI_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif fmt == "pdf":
        data_bytes = generate_pdf_report(serialized)
        filename = f"Reporte_Flash_CTI_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        media_type = "application/pdf"
    else:
        raise HTTPException(status_code=400, detail="Formato de exportación no soportado.")
        
    # Enviar archivo descargable
    return StreamingResponse(
        io.BytesIO(data_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- Servir Frontend ---
# Montamos el directorio del frontend de forma dinámica para compatibilidad multiplataforma
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(base_dir, "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
