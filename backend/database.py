from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, func
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from backend.config import DATABASE_URL

# SQLAlchemy Setup
# check_same_thread=False is needed only for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), unique=True, index=True, nullable=False)
    title = Column(String(500), index=True, nullable=False)
    summary = Column(Text, nullable=True)
    source = Column(String(100), index=True, nullable=False)
    source_type = Column(String(50), index=True, nullable=False)  # Noticia, Red Social, Comunicado Oficial, Video, Boletin
    publish_date = Column(DateTime, index=True, nullable=False)
    keywords = Column(Text, nullable=True)  # Guardadas como cadena separada por comas
    location = Column(String(100), index=True, nullable=True)  # Municipio o zona
    relevance = Column(String(20), index=True, default="BAJA")  # ALTA, MEDIA, BAJA
    topic = Column(String(50), index=True, default="General")  # Seguridad, Judicial, Medio Ambiente, Salud, Turismo, Frontera, Politica, Emergencia, Comunidad Indigena, General
    status = Column(String(20), index=True, default="Nuevo")  # Nuevo, Revisado, Importante, Descartado
    
    # Campos del analista para Reporte Flash
    analyst_notes = Column(Text, nullable=True)
    analysis_preliminary = Column(Text, nullable=True)
    regional_impact = Column(Text, nullable=True)
    elaborated_by = Column(String(100), nullable=True)
    
    # Metadatos del sistema
    is_alert = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApiKeyConfig(Base):
    __tablename__ = "api_key_configs"

    key_name = Column(String(100), primary_key=True, index=True)
    key_value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    # Inicializar llaves de API vacías si no existen
    db = SessionLocal()
    try:
        from backend.config import API_KEYS
        for k_name, k_val in API_KEYS.items():
            exists = db.query(ApiKeyConfig).filter(ApiKeyConfig.key_name == k_name).first()
            if not exists:
                db.add(ApiKeyConfig(key_name=k_name, key_value=k_val))
        db.commit()
    except Exception as e:
        print(f"Error al inicializar llaves API en BD: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
