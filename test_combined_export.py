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

print(f"Loaded {len(serialized)} articles. Testing combined exports...")

try:
    print("Generating combined Word document...")
    docx_bytes = generate_docx_report(serialized)
    print("Combined Word Success! Size:", len(docx_bytes))
except Exception as e:
    print("Combined Word FAILED:")
    import traceback
    traceback.print_exc()

try:
    print("Generating combined PDF document...")
    pdf_bytes = generate_pdf_report(serialized)
    print("Combined PDF Success! Size:", len(pdf_bytes))
except Exception as e:
    print("Combined PDF FAILED:")
    import traceback
    traceback.print_exc()

db.close()
