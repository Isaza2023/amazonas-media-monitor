import re
from datetime import datetime
import email.utils
from backend.config import RELEVANCE_KEYWORDS, ALERT_KEYWORDS

# Lista de ubicaciones monitoreadas en la región del Amazonas
MUNICIPALITIES_ZONES = {
    "Leticia": ["leticia", "capital del amazonas", "km 2", "km 6", "km 11"],
    "Puerto Nariño": ["puerto nariño", "nariño amazonas", "lagos de tarapoto"],
    "Tarapacá": ["tarapaca"],
    "La Pedrera": ["la pedrera"],
    "Puerto Santander": ["puerto santander"],
    "Mirití Paraná": ["miriti parana", "miriti"],
    "La Chorrera": ["la chorrera"],
    "El Encanto": ["el encanto"],
    "Puerto Arica": ["puerto arica"],
    "La Victoria": ["la victoria amazonas", "la victoria"],
    "Frontera - Brasil": ["tabatinga", "benjamin constant", "marco pontes", "atalaia do norte"],
    "Frontera - Perú": ["santa rosa", "iquitos", "caballococha", "chimbote peru", "loreto peru"],
    "Río Amazonas": ["rio amazonas", "fluvial amazonas", "cauce del amazonas"],
    "Triple Frontera": ["triple frontera", "tres fronteras", "frontera colombia brasil peru"]
}

# Mapeo de temas y sus términos relacionados
TOPIC_KEYWORDS = {
    "Seguridad": ["ejercito", "brigada de selva", "armada", "fuerza publica", "combate", "armas", "explosivo", "violencia", "homicidio", "atentado", "seguridad", "bloqueo", "protesta", "clan del golfo", "disidencias", "farc", "eln", "gao"],
    "Judicial": ["captura", "detencion", "fiscalia", "cti", "policia", "carcel", "juez", "judicial", "investigacion", "narcotrafico", "cocaina", "marihuana", "droga", "incautacion", "contrabando", "trata de personas", "abuso", "menor de edad"],
    "Medio Ambiente": ["deforestacion", "mineria ilegal", "tala", "incendio forestal", "parque nacional", "pnn", "amacayacu", "chiribiquete", "fauna", "flora", "medio ambiente", "contaminacion", "corporacion cda", "cda"],
    "Salud": ["salud", "dengue", "malaria", "hospital", "clinica", "vacunacion", "epidemia", "intoxicacion", "salud publica", "medico"],
    "Turismo": ["turismo", "turista", "ecoturismo", "hoteleria", "reserva natural", "visitante", "festival"],
    "Frontera": ["migracion", "frontera", "paso fronterizo", "migrante", "tabatinga", "santa rosa", "iquitos", "triple frontera", "soberania"],
    "Politica": ["elecciones", "alcalde", "gobernador", "gobernacion", "alcaldia", "concejo", "asamblea", "protesta", "paro", "bloqueo", "politica"],
    "Emergencia": ["emergencia", "accidente fluvial", "naufragio", "inundacion", "incendio", "desastre", "ungrd", "bomberos", "defensa civil", "cruz roja", "clima", "ideam"],
    "Comunidad Indígena": ["indigena", "comunidad", "resguardo", "cabildo", "etnia", "cacique", "ticuna", "huitoto", "yagua", "cocama", "boras", "ocaina"]
}

def clean_html(text: str) -> str:
    """Elimina etiquetas HTML de un texto."""
    if not text:
        return ""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).strip()

def normalize_date(date_str: str) -> datetime:
    """Intenta normalizar fechas desde formatos comunes de RSS a un objeto datetime."""
    if not date_str:
        return datetime.utcnow()
    
    # Intentar parsear con email.utils (formato RFC 2822 común en RSS)
    try:
        parsed = email.utils.parsedate_to_datetime(date_str)
        # Convertir a datetime naive en UTC
        return parsed.replace(tzinfo=None)
    except:
        pass

    # Formato ISO (ej. 2026-06-15T12:00:00)
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
            
    return datetime.utcnow()

def extract_location(text: str) -> str:
    """Busca menciones geográficas en el texto y retorna la zona correspondiente."""
    if not text:
        return "General"
    
    text_lower = text.lower()
    for zone, variations in MUNICIPALITIES_ZONES.items():
        for var in variations:
            if re.search(r'\b' + re.escape(var) + r'\b', text_lower):
                return zone
                
    # Búsqueda más laxa si no se encontró con límites de palabra (útil para río, frontera, etc.)
    for zone, variations in MUNICIPALITIES_ZONES.items():
        if zone in ["Frontera - Brasil", "Frontera - Perú", "Río Amazonas", "Triple Frontera"]:
            for var in variations:
                if var in text_lower:
                    return zone
                    
    return "General"

def extract_keywords(text: str) -> str:
    """Extrae palabras clave detectadas en el texto basadas en la configuración."""
    if not text:
        return ""
    
    text_lower = text.lower()
    detected = []
    
    # Combinar todas las palabras clave configuradas
    all_keywords = set(ALERT_KEYWORDS)
    for kw_list in RELEVANCE_KEYWORDS.values():
        all_keywords.update(kw_list)
        
    for kw in all_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            detected.append(kw)
            
    return ", ".join(sorted(list(set(detected))))

def classify_relevance(text: str) -> str:
    """Clasifica la relevancia (ALTA, MEDIA, BAJA) analizando palabras clave."""
    if not text:
        return "BAJA"
    
    text_lower = text.lower()
    
    # Primero verificar relevancia alta
    for kw in RELEVANCE_KEYWORDS["ALTA"]:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            return "ALTA"
            
    # Luego verificar relevancia media
    for kw in RELEVANCE_KEYWORDS["MEDIA"]:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            return "MEDIA"
            
    return "BAJA"

def detect_alert(text: str) -> bool:
    """Determina si un artículo contiene términos críticos de alerta de seguridad."""
    if not text:
        return False
    
    text_lower = text.lower()
    for kw in ALERT_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            return True
            
    return False

def detect_topic(text: str) -> str:
    """Identifica el tema principal del artículo según las palabras encontradas."""
    if not text:
        return "General"
    
    text_lower = text.lower()
    scores = {topic: 0 for topic in TOPIC_KEYWORDS.keys()}
    
    for topic, words in TOPIC_KEYWORDS.items():
        for word in words:
            if re.search(r'\b' + re.escape(word) + r'\b', text_lower):
                scores[topic] += 1
                
    # Encontrar el tema con mayor coincidencia
    max_score = 0
    best_topic = "General"
    for topic, score in scores.items():
        if score > max_score:
            max_score = score
            best_topic = topic
            
    return best_topic
