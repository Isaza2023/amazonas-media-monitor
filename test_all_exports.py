import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal, NewsArticle
from backend.report_generator import generate_docx_report, generate_pdf_report

db = SessionLocal()
articles = db.query(NewsArticle).all()

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

print(f"Loaded {len(serialized)} articles from database for testing.")

# Probar exportación de cada uno individualmente para identificar cuál falla
for index, art in enumerate(serialized):
    # Probar DOCX
    try:
        generate_docx_report([art])
    except Exception as e:
        print(f"ERROR DOCX en articulo ID {art['id']} ({art['title'][:40]}):")
        import traceback
        traceback.print_exc()
        
    # Probar PDF
    try:
        generate_pdf_report([art])
    except Exception as e:
        print(f"ERROR PDF en articulo ID {art['id']} ({art['title'][:40]}):")
        import traceback
        traceback.print_exc()

print("Prueba de todos los artículos individuales finalizada.")
db.close()
