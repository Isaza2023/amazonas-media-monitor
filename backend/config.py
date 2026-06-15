import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración básica
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

# Base de datos - Configuración dinámica para compatibilidad local y en la nube
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_db_dir = os.path.join(base_dir, "database")
try:
    os.makedirs(default_db_dir, exist_ok=True)
except Exception as e:
    print(f"Advertencia al crear la carpeta de base de datos: {e}")

default_db_path = os.path.join(default_db_dir, "media_monitor.db")
default_db_url = f"sqlite:///{default_db_path.replace(os.sep, '/')}"

DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Palabras clave principales para búsquedas en Google News RSS
SEARCH_KEYWORDS = [
    "Amazonas Colombia", "Leticia", "Puerto Nariño", "Tabatinga", "Santa Rosa", 
    "Iquitos", "triple frontera", "rio Amazonas", "La Pedrera", "Tarapaca", 
    "Puerto Santander Amazonas", "Miriti Parana", "La Chorrera", "El Encanto", 
    "Puerto Arica", "La Victoria Amazonas", "narcotrafico Amazonas", 
    "homicidio Leticia", "captura Leticia", "Fiscalia Amazonas", "CTI Amazonas", 
    "Policia Amazonas", "Ejercito Amazonas", "Brigada de Selva 26", "Armada Amazonas", 
    "migracion Amazonas", "contrabando Amazonas", "mineria ilegal Amazonas", 
    "deforestacion Amazonas", "turismo Amazonas", "emergencia Amazonas", 
    "salud Amazonas", "accidente fluvial", "transporte fluvial", "orden publico Amazonas"
]

# Palabras clave para clasificación de relevancia
RELEVANCE_KEYWORDS = {
    "ALTA": [
        "homicidio", "asesinato", "masacre", "captura", "detencion", "gao", "disidencias", "eln", "clan del golfo", 
        "narcotrafico", "cocaina", "incautacion", "droga", "seguridad", "orden publico", "desaparecido", 
        "desaparicion", "emergencia", "frontera", "atentado", "amenaza", "bloqueo", "accidente grave", 
        "combate", "armas", "explosivo", "contrabando", "mineria ilegal", "deforestacion", "incendio forestal",
        "migracion irregular", "protesta", "disturbios", "fuerza publica", "cctv", "fiscalia", "cti", "policia"
    ],
    "MEDIA": [
        "politica", "elecciones", "alcalde", "gobernador", "turismo", "ecoturismo", "salud", "hospital", 
        "comunidad indigena", "resguardo", "transporte fluvial", "bote", "embarcacion", "economia", 
        "medio ambiente", "fauna", "parque nacional", "comunicado oficial", "reunion", "inauguracion",
        "salud publica", "dengue", "malaria"
    ]
}

# Palabras clave críticas para alertas inmediatas
ALERT_KEYWORDS = [
    "homicidio", "masacre", "captura", "atentado", "amenaza", "desaparecido", "narcotrafico", 
    "incautacion", "frontera", "accidente fluvial", "emergencia", "incendio", "deforestacion", 
    "grupo armado", "disidencias", "eln", "gao", "explosivo", "armas", "migracion irregular", 
    "contrabando", "protesta", "bloqueo", "menor de edad", "violencia intrafamiliar", "abuso", 
    "trata de personas"
]

# Canales y Feeds RSS de medios e instituciones
RSS_FEEDS = {
    # Google News RSS (búsquedas en español)
    "google_news": [
        "https://news.google.com/rss/search?q=Amazonas+Colombia&hl=es-419&gl=CO&ceid=CO:es-419",
        "https://news.google.com/rss/search?q=Leticia+Amazonas&hl=es-419&gl=CO&ceid=CO:es-419",
        "https://news.google.com/rss/search?q=Puerto+Narino&hl=es-419&gl=CO&ceid=CO:es-419",
        "https://news.google.com/rss/search?q=triple+frontera+Amazonas&hl=es-419&gl=CO&ceid=CO:es-419",
    ],
    # Medios Nacionales y Regionales Colombianos
    "medios_nacionales": [
        {"name": "El Tiempo - Colombia", "url": "https://www.eltiempo.com/rss/colombia.xml"},
        {"name": "El Espectador - Judicial", "url": "https://www.elespectador.com/arc/outboundfeeds/rss/category/judicial/?outputType=xml"},
        {"name": "Semana - Nacion", "url": "https://www.semana.com/arc/outboundfeeds/rss/section/nacion/?outputType=xml"},
        {"name": "Caracol Radio", "url": "https://caracol.com.co/arc/outboundfeeds/rss/feed/main/"}
    ],
    # Medios e instituciones de Brasil y Perú (Triple Frontera)
    "medios_frontera": [
        {"name": "G1 Amazonas (Brasil)", "url": "https://g1.globo.com/am/amazonas/index.html"},  # Se parsea directo o con fallback
        {"name": "Portal Tabatinga (Brasil)", "url": "http://portaltabatinga.com.br/feed/"},
        {"name": "Diario La Region - Iquitos (Peru)", "url": "https://diariolaregion.com/web/feed/"}
    ]
}

# Direcciones institucionales públicas (para enlaces y monitoreo manual/semiautomático)
INSTITUTIONAL_SITES = [
    {"name": "Gobernación del Amazonas", "url": "https://www.amazonas.gov.co", "category": "Gobernanza"},
    {"name": "Alcaldía de Leticia", "url": "http://www.leticia-amazonas.gov.co", "category": "Gobernanza"},
    {"name": "Policía Nacional - Colombia", "url": "https://www.policia.gov.co", "category": "Seguridad"},
    {"name": "Fiscalía General de la Nación", "url": "https://www.fiscalia.gov.co", "category": "Judicial"},
    {"name": "Fuerzas Militares de Colombia", "url": "https://www.cgfm.mil.co", "category": "Defensa"},
    {"name": "Armada de Colombia", "url": "https://www.armada.mil.co", "category": "Defensa"},
    {"name": "Ejército Nacional de Colombia", "url": "https://www.ejercito.mil.co", "category": "Defensa"},
    {"name": "Migración Colombia", "url": "https://www.migracioncolombia.gov.co", "category": "Frontera"},
    {"name": "Defensoría del Pueblo", "url": "https://www.defensoria.gov.co", "category": "Derechos"},
    {"name": "Procuraduría General", "url": "https://www.procuradurias.gov.co", "category": "Control"},
    {"name": "UNGRD - Gestión del Riesgo", "url": "https://portal.gestiondelriesgo.gov.co", "category": "Emergencia"},
    {"name": "IDEAM - Alertas Ambientales", "url": "http://www.ideam.gov.co", "category": "Clima"},
    {"name": "Parques Nacionales Naturales", "url": "https://www.parquesnacionales.gov.co", "category": "Medio Ambiente"}
]

# APIs de redes sociales (Configuración simulada / Preparada para claves)
API_KEYS = {
    "YOUTUBE_API_KEY": os.getenv("YOUTUBE_API_KEY", ""),
    "X_API_KEY": os.getenv("X_API_KEY", ""),
    "X_API_SECRET": os.getenv("X_API_SECRET", ""),
    "X_BEARER_TOKEN": os.getenv("X_BEARER_TOKEN", ""),
    "FACEBOOK_ACCESS_TOKEN": os.getenv("FACEBOOK_ACCESS_TOKEN", ""),
    "INSTAGRAM_ACCESS_TOKEN": os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
}
