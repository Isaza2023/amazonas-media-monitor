/* ==========================================================================
   FRONTEND LOGIC (JAVASCRIPT) - AMAZONAS MEDIA MONITOR (PREMIUM VERSION)
   ========================================================================== */

// Configuración y Variables de Estado Global
const API_BASE = ""; 
let isDemoMode = false;
let currentTab = "dashboard";
let articlesList = [];
let selectedArticleIds = new Set();
let currentPage = 1;
const recordsPerPage = 15;

// Variables de Control de Recarga y Alertas
let autoSyncIntervalId = null;
let autoSyncEnabled = true;
let alertSoundEnabled = true;

// Variables de Instancia de Gráficos (Chart.js) y Mapas (Leaflet)
let chartTrend = null;
let chartTopic = null;
let chartLocation = null;
let chartRelevance = null;
let chartSource = null;
let mapInstance = null;
let mapMarkers = [];

// Catálogo de Coordenadas Geográficas (Amazonas y Fronteras)
const locationCoords = {
    "Leticia": [-4.2126, -69.9406],
    "Puerto Nariño": [-3.7708, -70.3833],
    "Tarapacá": [-2.8944, -69.7483],
    "La Pedrera": [-1.3094, -69.5786],
    "Puerto Santander": [-2.1053, -71.4081],
    "Mirití Paraná": [-1.6506, -71.8544],
    "La Chorrera": [-1.4422, -72.7872],
    "El Encanto": [-1.7314, -73.2086],
    "Puerto Arica": [-2.1558, -71.8842],
    "La Victoria": [-4.1444, -69.9750],
    "Frontera - Brasil": [-4.2250, -69.9320], // Tabatinga
    "Frontera - Perú": [-4.2240, -69.9530],   // Santa Rosa / Iquitos
    "Río Amazonas": [-3.9500, -70.1500],
    "Triple Frontera": [-4.2185, -69.9430],
    "General": [-3.0000, -71.0000]
};

// Backup Estático de Fuentes (Si no se puede leer sources.json vía HTTP)
const backupSources = [
    { "id": "google_news_rss", "name": "Google News RSS", "type": "Noticia", "target": "Amazonas Colombia / Leticia", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 15 min", "observations": "Sincronizado vía feed público." },
    { "id": "gdelt_project", "name": "GDELT Project API", "type": "Noticia", "target": "Frontera y Eventos Globales", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 30 min", "observations": "Consulta OSINT mundial." },
    { "id": "medios_nacionales", "name": "Medios Nacionales (El Tiempo/Espectador)", "type": "Noticia", "target": "Sección Judicial / Orden Público", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 15 min", "observations": "Filtros de texto automáticos." },
    { "id": "gobernacion_amazonas", "name": "Gobernación del Amazonas", "type": "Comunicado Oficial", "target": "Boletines de Prensa", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Prensa oficial institucional." },
    { "id": "alcaldia_leticia", "name": "Alcaldía de Leticia", "type": "Comunicado Oficial", "target": "Medidas y Decretos", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Edictos gubernamentales locales." },
    { "id": "policia_colombia", "name": "Policía Nacional - Amazonas", "type": "Comunicado Oficial", "target": "Reporte Judicial Diarios", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 30 min", "observations": "Partes oficiales de capturas." },
    { "id": "fiscalia_colombia", "name": "Fiscalía General - CTI", "type": "Comunicado Oficial", "target": "Resultados de Operaciones", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 30 min", "observations": "Monitoreo de comunicados de prensa." },
    { "id": "ejercito_colombia", "name": "Ejército - Brigada de Selva 26", "type": "Comunicado Oficial", "target": "Soberanía y Frontera", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Informes de control en ríos." },
    { "id": "armada_colombia", "name": "Armada de Colombia", "type": "Comunicado Oficial", "target": "Control Fluvial y Ambiental", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 30 min", "observations": "Reportes de incautaciones de pesca." },
    { "id": "migracion_colombia", "name": "Migración Colombia", "type": "Comunicado Oficial", "target": "Controles Migratorios Leticia", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Reportes de flujo en puentes." },
    { "id": "ungrd_colombia", "name": "UNGRD - Gestión de Riesgos", "type": "Comunicado Oficial", "target": "Alertas Climáticas/Incendios", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Eventos de riesgo de inundación." },
    { "id": "ideam_colombia", "name": "IDEAM - Alertas Hidrológicas", "type": "Comunicado Oficial", "target": "Caudal del Río Amazonas", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 15 min", "observations": "Alertas hidrológicas tempranas." },
    { "id": "parques_nacionales", "name": "Parques Nacionales (Amacayacu)", "type": "Comunicado Oficial", "target": "Alertas de Deforestación", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 12 horas", "observations": "Monitoreo forestal." },
    { "id": "medios_brasil", "name": "Medios Brasil (G1 / Portal Tabatinga)", "type": "Noticia", "target": "Triple Frontera - Lado Brasil", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Seguimiento en portugués." },
    { "id": "medios_peru", "name": "Medios Perú (Diario La Región Iquitos)", "type": "Noticia", "target": "Triple Frontera - Lado Perú", "status": "Activa", "connection_state": "Estable", "update_frequency": "Cada 1 hora", "observations": "Prensa provincial de Loreto." },
    { "id": "youtube_api", "name": "YouTube API v3", "type": "Video", "target": "Monitoreo Institucional", "status": "Configurable", "connection_state": "Requiere API Key", "update_frequency": "Cada 2 horas", "observations": "Mocks activos offline." },
    { "id": "twitter_api", "name": "X / Twitter API v2", "type": "Red Social", "target": "Alertas Leticia y Tabatinga", "status": "Configurable", "connection_state": "Requiere Token", "update_frequency": "Cada 5 min", "observations": "Búsquedas preparadas en código." },
    { "id": "facebook_api", "name": "Facebook Graph API", "type": "Red Social", "target": "Grupos Vecinales Leticia", "status": "Configurable", "connection_state": "Requiere Token", "update_frequency": "Cada 30 min", "observations": "Monitoreo de portales locales." },
    { "id": "instagram_api", "name": "Instagram Business API", "type": "Red Social", "target": "Menciones Regionales", "status": "Configurable", "connection_state": "Requiere Token", "update_frequency": "Cada 1 hora", "observations": "Publicaciones ciudadanas." },
    { "id": "tiktok_api", "name": "TikTok API", "type": "Red Social", "target": "Denuncias Virales", "status": "Inactiva", "connection_state": "No configurada", "update_frequency": "Manual", "observations": "Pendiente de token oficial." }
];

// ==========================================================================
// INICIALIZACIÓN Y DETECCION DE ENTORNO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    // 1. Iniciar reloj digital superior
    startClock();

    // 2. Determinar si estamos offline / archivo local o si el backend no responde
    await detectMode();

    // 3. Inicializar el mapa de Leaflet
    initMap();

    // 4. Cargar datos por primera vez
    loadDashboardData();
    loadFeedData();
    loadAlertsData();
    loadSourcesData();
    
    if (!isDemoMode) {
        loadApiConfig();
        checkSystemStatus();
        setInterval(checkSystemStatus, 15000); // Polling de estado del servidor
    } else {
        // Simular estado conectado del sistema en modo Demo
        document.getElementById("status-dot").className = "status-dot green";
        document.getElementById("status-text").textContent = "Conectado (Demo)";
        document.getElementById("last-update-time").textContent = new Date().toLocaleTimeString('es-CO');
    }

    // 5. Configurar sincronización automática periódica
    setupAutoSync();
}

function startClock() {
    const clockEl = document.getElementById("live-clock");
    const updateTime = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockEl.innerHTML = `<i class="fa-solid fa-clock"></i> ${dateStr.toUpperCase()} - ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
}

async function detectMode() {
    const badge = document.getElementById("mode-badge");
    
    // Si corre por protocolo file:///
    if (window.location.protocol === 'file:') {
        setDemoMode(badge, "Protocolo local (file:///) detectado. Iniciando Modo Demo Offline.");
        return;
    }

    // Intentar ping al backend
    try {
        const response = await fetch(`${API_BASE}/api/status`, { signal: AbortSignal.timeout(1500) });
        if (response.ok) {
            isDemoMode = false;
            badge.className = "mode-badge production-mode";
            badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> EN VIVO`;
            console.log("Conectado con éxito al backend de Monitoreo.");
        } else {
            throw new Error();
        }
    } catch (e) {
        setDemoMode(badge, "No se pudo establecer conexión con el backend de FastAPI. Iniciando Modo Demo local.");
    }
}

function setDemoMode(badgeEl, reason) {
    isDemoMode = true;
    badgeEl.className = "mode-badge demo-mode";
    badgeEl.innerHTML = `<i class="fa-solid fa-flask"></i> MODO DEMO`;
    console.log(reason);

    // Inicializar base de datos simulada en localStorage si no existe
    if (!localStorage.getItem("amazonas_demo_articles")) {
        const demoData = window.demoArticles || [];
        localStorage.setItem("amazonas_demo_articles", JSON.stringify(demoData));
    }
}

// ==========================================================================
// CONFIGURACIÓN DE EVENTOS
// ==========================================================================
function setupEventListeners() {
    // 1. Alternar Tema Claro / Oscuro
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle.addEventListener("click", () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", newTheme);
        themeToggle.querySelector("i").className = newTheme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
        
        setTimeout(updateChartsTheme, 200);
    });

    // 2. Cambio de Pestañas (Tabs)
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // 3. Botón Sincronizar / Actualizar Ahora
    document.getElementById("btn-sync-now").addEventListener("click", triggerManualSync);

    // 4. Botón Alternar Auto-Sincronización
    const autoSyncBtn = document.getElementById("btn-toggle-auto-sync");
    autoSyncBtn.addEventListener("click", () => {
        autoSyncEnabled = !autoSyncEnabled;
        const statusEl = document.getElementById("auto-sync-status");
        if (autoSyncEnabled) {
            autoSyncBtn.classList.remove("btn-danger");
            autoSyncBtn.classList.add("btn-secondary");
            statusEl.textContent = "ON";
            setupAutoSync();
        } else {
            autoSyncBtn.classList.add("btn-danger");
            statusEl.textContent = "OFF";
            if (autoSyncIntervalId) clearInterval(autoSyncIntervalId);
        }
    });

    // 5. Botón Alternar Silencio / Sonido Alertas
    const soundToggleBtn = document.getElementById("sound-toggle");
    soundToggleBtn.addEventListener("click", () => {
        alertSoundEnabled = !alertSoundEnabled;
        const icon = soundToggleBtn.querySelector("i");
        if (alertSoundEnabled) {
            soundToggleBtn.title = "Desactivar sonido de alertas";
            icon.className = "fa-solid fa-volume-high";
            soundToggleBtn.style.color = "";
        } else {
            soundToggleBtn.title = "Activar sonido de alertas";
            icon.className = "fa-solid fa-volume-xmark";
            soundToggleBtn.style.color = "#ef4444";
        }
    });

    // 6. Botón de Pantalla Completa
    const fsToggleBtn = document.getElementById("fullscreen-toggle");
    fsToggleBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                fsToggleBtn.querySelector("i").className = "fa-solid fa-compress";
            }).catch(err => {
                console.error("Error al activar pantalla completa: ", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                fsToggleBtn.querySelector("i").className = "fa-solid fa-expand";
            });
        }
    });

    // 7. Botones de Selector de Vista (Ejecutiva vs Analista)
    const btnAnalyst = document.getElementById("btn-view-analyst");
    const btnExecutive = document.getElementById("btn-view-executive");

    btnAnalyst.addEventListener("click", () => {
        btnExecutive.classList.remove("active");
        btnAnalyst.classList.add("active");
        document.body.classList.remove("view-mode-executive");
        setTimeout(updateChartsTheme, 200);
        if (mapInstance) mapInstance.invalidateSize();
    });

    btnExecutive.addEventListener("click", () => {
        btnAnalyst.classList.remove("active");
        btnExecutive.classList.add("active");
        document.body.classList.add("view-mode-executive");
        // Forzar recalcular tamaño del mapa y gráficos en pantalla completa
        setTimeout(updateChartsTheme, 200);
        if (mapInstance) mapInstance.invalidateSize();
    });

    // 8. Filtros del Feed
    const filterSearch = document.getElementById("filter-search");
    const filterRelevance = document.getElementById("filter-relevance");
    const filterTopic = document.getElementById("filter-topic");
    const filterLocation = document.getElementById("filter-location");
    const filterSourceType = document.getElementById("filter-source-type");
    const filterStatus = document.getElementById("filter-status");
    const filterStartDate = document.getElementById("filter-start-date");
    const filterEndDate = document.getElementById("filter-end-date");
    
    // Filtros rápidos checkboxes
    const chkCritical = document.getElementById("chk-only-critical");
    const chkNew = document.getElementById("chk-only-new");
    const chkImportant = document.getElementById("chk-only-important");
    
    const filterInputs = [
        filterRelevance, filterTopic, filterLocation, 
        filterSourceType, filterStatus, filterStartDate, filterEndDate,
        chkCritical, chkNew, chkImportant
    ];
    
    filterInputs.forEach(input => {
        input.addEventListener("change", () => {
            currentPage = 1;
            loadFeedData();
        });
    });
    
    let searchTimeout;
    filterSearch.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadFeedData();
        }, 400);
    });

    // 9. Botón Limpiar Filtros
    document.getElementById("btn-clear-filters").addEventListener("click", () => {
        filterSearch.value = "";
        filterRelevance.value = "";
        filterTopic.value = "";
        filterLocation.value = "";
        filterSourceType.value = "";
        filterStatus.value = "";
        filterStartDate.value = "";
        filterEndDate.value = "";
        chkCritical.checked = false;
        chkNew.checked = false;
        chkImportant.checked = false;
        currentPage = 1;
        loadFeedData();
    });

    // 10. Checkbox de Selección General en Tabla
    document.getElementById("select-all-checkbox").addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        const visibleCheckboxes = document.querySelectorAll(".article-select-checkbox");
        visibleCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            const id = parseInt(cb.getAttribute("data-id"));
            if (isChecked) {
                selectedArticleIds.add(id);
            } else {
                selectedArticleIds.delete(id);
            }
        });
        updateSelectedBadge();
        updateReportSelectedList();
        renderReportPreview();
    });

    // 11. Desmarcar Selección General
    document.getElementById("btn-clear-selection").addEventListener("click", () => {
        selectedArticleIds.clear();
        document.getElementById("select-all-checkbox").checked = false;
        const visibleCheckboxes = document.querySelectorAll(".article-select-checkbox");
        visibleCheckboxes.forEach(cb => cb.checked = false);
        updateSelectedBadge();
        updateReportSelectedList();
        renderReportPreview();
    });

    // 12. Botones de Paginación
    document.getElementById("btn-prev-page").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadFeedData();
        }
    });
    document.getElementById("btn-next-page").addEventListener("click", () => {
        currentPage++;
        loadFeedData();
    });

    // 13. Guardar Configuración de API
    document.getElementById("api-keys-form").addEventListener("submit", saveApiConfig);

    // 14. Ingesta Manual de Noticias
    document.getElementById("manual-ingest-form").addEventListener("submit", submitManualIngest);

    // 15. Cambiar Intervalo de Recarga
    document.getElementById("interval-select").addEventListener("change", (e) => {
        updateSyncInterval(e.target.value);
    });

    // 16. Modal de Edición (Cerrar / Cancelar)
    document.getElementById("btn-close-modal").addEventListener("click", closeModal);
    document.getElementById("btn-cancel-edit").addEventListener("click", closeModal);
    document.getElementById("edit-article-form").addEventListener("submit", submitArticleEdit);

    // 17. Exportación de Reportes
    document.getElementById("btn-download-pdf").addEventListener("click", () => triggerExport("pdf"));
    document.getElementById("btn-download-word").addEventListener("click", () => triggerExport("word"));
    document.getElementById("btn-print-report").addEventListener("click", () => window.print());
    
    document.getElementById("btn-export-selected-excel").addEventListener("click", () => triggerExport("excel"));
    document.getElementById("btn-export-selected-json").addEventListener("click", () => triggerExport("json"));
}

function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.add("active");
    
    if (tabId === "dashboard") {
        loadDashboardData();
        if (mapInstance) {
            setTimeout(() => mapInstance.invalidateSize(), 100);
        }
    } else if (tabId === "feed") {
        loadFeedData();
    } else if (tabId === "alerts") {
        loadAlertsData();
    } else if (tabId === "sources") {
        loadSourcesData();
    } else if (tabId === "flash-report") {
        updateReportSelectedList();
        renderReportPreview();
    }
}

// ==========================================================================
// MAPA INTERACTIVO (LEAFLET.JS)
// ==========================================================================
function initMap() {
    const container = document.getElementById("map-container");
    if (!container) return;

    // Crear mapa centrado en Leticia y la triple frontera
    mapInstance = L.map('map-container').setView([-4.0, -71.2], 7);

    // Cargar capa de mapa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapInstance);
}

function updateMapMarkers(articles) {
    if (!mapInstance) return;

    // Eliminar marcadores previos
    mapMarkers.forEach(m => mapInstance.removeLayer(m));
    mapMarkers = [];

    // Agrupar publicaciones por lugar geográfico
    const groups = {};
    articles.forEach(art => {
        const loc = art.location || "General";
        if (!groups[loc]) {
            groups[loc] = {
                count: 0,
                maxRelevance: "BAJA",
                latestTitle: art.title,
                id: art.id
            };
        }
        groups[loc].count++;
        
        // Clasificación de relevancia crítica de grupo
        if (art.relevance === "ALTA" || groups[loc].maxRelevance !== "ALTA") {
            if (art.relevance === "ALTA") groups[loc].maxRelevance = "ALTA";
            else if (art.relevance === "MEDIA" && groups[loc].maxRelevance === "BAJA") groups[loc].maxRelevance = "MEDIA";
        }
    });

    // Pintar los marcadores geográficos en base al diccionario de coordenadas
    Object.keys(groups).forEach(locName => {
        const coords = locationCoords[locName] || locationCoords["General"];
        const groupData = groups[locName];
        
        let severityClass = "low";
        if (groupData.maxRelevance === "ALTA") severityClass = "critical";
        else if (groupData.maxRelevance === "MEDIA") severityClass = "medium";

        // Crear icono animado CSS
        const customIcon = L.divIcon({
            className: `pulse-marker ${severityClass}`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        const marker = L.marker(coords, { icon: customIcon }).addTo(mapInstance);
        marker.bindPopup(`
            <div class="map-popup-card">
                <h4><i class="fa-solid fa-location-dot"></i> ${locName.toUpperCase()}</h4>
                <p><strong>Menciones:</strong> ${groupData.count} casos monitoreados.</p>
                <p><strong>Severidad Máxima:</strong> <span class="badge-relevance ${groupData.maxRelevance.toLowerCase()}">${groupData.maxRelevance}</span></p>
                <p><strong>Último Suceso:</strong> "${groupData.latestTitle}"</p>
                <button class="btn btn-primary btn-sm btn-block" style="margin-top: 8px; font-size: 10px; padding: 4px;" onclick="openEditModal(${groupData.id})">
                    <i class="fa-solid fa-pencil"></i> Gestionar Caso
                </button>
            </div>
        `);
        mapMarkers.push(marker);
    });
}

// ==========================================================================
// AUDIO SINTETIZADOR PARA ALERTAS (WEB AUDIO API)
// ==========================================================================
function playAlertSound() {
    if (!alertSoundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Primer tono corto y agudo
        let osc1 = audioCtx.createOscillator();
        let gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // La5
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.15);
        
        // Segundo tono un poco más tarde
        setTimeout(() => {
            let osc2 = audioCtx.createOscillator();
            let gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // Do6
            gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.25);
        }, 120);
    } catch (e) {
        console.error("No se pudo reproducir el sintetizador de audio: ", e);
    }
}

// ==========================================================================
// MONITOREO DE ESTADO Y PROGRAMADOR
// ==========================================================================
async function checkSystemStatus() {
    if (isDemoMode) return;
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        
        const dot = document.getElementById("status-dot");
        const statusText = document.getElementById("status-text");
        const lastUpdateText = document.getElementById("last-update-time");
        
        lastUpdateText.textContent = data.last_update.split(" ")[1] || data.last_update;
        document.getElementById("interval-select").value = data.update_interval_minutes;

        if (data.is_fetching) {
            dot.className = "status-dot orange";
            statusText.textContent = "Monitoreando...";
            document.getElementById("btn-sync-now").disabled = true;
            document.getElementById("btn-sync-now").innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Monitoreando...`;
        } else {
            dot.className = "status-dot green";
            statusText.textContent = "Conectado";
            document.getElementById("btn-sync-now").disabled = false;
            document.getElementById("btn-sync-now").innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Actualizar Ahora`;
        }
    } catch (e) {
        document.getElementById("status-dot").className = "status-dot orange";
        document.getElementById("status-text").textContent = "Sin conexión";
    }
}

function setupAutoSync() {
    if (autoSyncIntervalId) clearInterval(autoSyncIntervalId);
    
    if (!autoSyncEnabled) return;
    
    const minutes = parseInt(document.getElementById("interval-select").value) || 15;
    
    autoSyncIntervalId = setInterval(() => {
        console.log("Auto-recarga ejecutada.");
        triggerManualSync(true); // bandera silenciosa
    }, minutes * 60 * 1000);
}

async function triggerManualSync(silent = false) {
    if (isDemoMode) {
        // En modo Demo, simulamos una actualización
        const dot = document.getElementById("status-dot");
        const statusText = document.getElementById("status-text");
        const lastUpdateText = document.getElementById("last-update-time");
        const btnSync = document.getElementById("btn-sync-now");

        dot.className = "status-dot orange";
        statusText.textContent = "Simulando Recarga...";
        btnSync.disabled = true;
        btnSync.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Consultando...`;

        setTimeout(() => {
            dot.className = "status-dot green";
            statusText.textContent = "Conectado (Demo)";
            lastUpdateText.textContent = new Date().toLocaleTimeString('es-CO');
            btnSync.disabled = false;
            btnSync.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Actualizar Ahora`;
            
            // Simular hallazgo de nueva noticia crítica en la frontera
            injectRandomAlert();
            
            loadDashboardData();
            loadFeedData();
            loadAlertsData();
            loadSourcesData();
        }, 1500);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/fetch`, { method: "POST" });
        checkSystemStatus();
        
        setTimeout(() => {
            loadDashboardData();
            loadFeedData();
            loadAlertsData();
            loadSourcesData();
        }, 5000);
    } catch (e) {
        if (!silent) alert("Error al iniciar la sincronización.");
    }
}

function injectRandomAlert() {
    // Inyecta un caso de prueba aleatorio en LocalStorage si no ha sido inyectado
    const storageData = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
    
    // Verificar si ya inyectamos el caso random
    if (storageData.some(a => a.id === 999)) return;

    const randomAlert = {
        "id": 999,
        "title": "Alerta Binacional: Enfrentamiento armado entre contrabandistas y Policía Federal en Tabatinga",
        "url": "https://www.portaltabatinga.com.br/alert-enfrentamiento-contrabandistas-tabatinga",
        "summary": "Reportes de prensa local en Tabatinga informan sobre intercambio de disparos en inmediaciones del paso de frontera terrestre. Vecinos reportan zozobra en barrios colindantes de Leticia.",
        "source": "Medios de Brasil",
        "source_type": "Noticia",
        "publish_date": new Date().toISOString(),
        "keywords": "atentado, armas, frontera, tabatinga, leticia, tiroteo, policía",
        "location": "Frontera - Brasil",
        "relevance": "ALTA",
        "topic": "Seguridad",
        "status": "Nuevo",
        "is_alert": true,
        "analyst_notes": "Sonido emitido. Coordinando canales con la patrulla de policía colombiana fronteriza.",
        "analysis_preliminary": "Enfrentamiento en operativo aduanero de incautación de precursores químicos.",
        "regional_impact": "Generación de pánico en la frontera terrestre colombo-brasileña.",
        "elaborated_by": "Monitoreo Automático CTI"
    };

    storageData.unshift(randomAlert);
    localStorage.setItem("amazonas_demo_articles", JSON.stringify(storageData));
    
    // Reproducir sonido de alerta
    playAlertSound();
    
    // Notificación en consola
    console.log("¡Nueva Alerta Crítica Inyectada de forma simulada!");
}

async function updateSyncInterval(minutes) {
    setupAutoSync();
    if (isDemoMode) return;
    try {
        await fetch(`${API_BASE}/api/status/interval?minutes=${minutes}`, { method: "POST" });
        checkSystemStatus();
    } catch (e) {
        console.error("Error al actualizar intervalo");
    }
}

// ==========================================================================
// RENDERIZADO DE GRÁFICOS Y KPIs (TABESTADÍSTICAS)
// ==========================================================================
async function loadDashboardData() {
    let stats = null;
    let articles = [];

    if (isDemoMode) {
        articles = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]").filter(a => a.status !== "Descartado");
        stats = calculateLocalStats(articles);
    } else {
        try {
            const response = await fetch(`${API_BASE}/api/stats`);
            if (!response.ok) throw new Error();
            stats = await response.json();
            
            const feedRes = await fetch(`${API_BASE}/api/articles?limit=1000`);
            const feedData = await feedRes.json();
            articles = feedData.articles;
        } catch (e) {
            console.error("Fallo de conexión API Stats.");
            return;
        }
    }

    if (!stats) return;

    // Actualizar Tarjetas KPI en la UI
    document.getElementById("kpi-total").textContent = articles.length;
    
    const newCount = articles.filter(a => a.status === "Nuevo").length;
    document.getElementById("kpi-new").textContent = newCount;
    document.getElementById("menu-new-badge").textContent = newCount;
    document.getElementById("menu-new-badge").style.display = newCount > 0 ? "block" : "none";
    
    document.getElementById("kpi-alerts").textContent = stats.total_alerts;

    const highCount = articles.filter(a => a.relevance === "ALTA").length;
    document.getElementById("kpi-high").textContent = highCount;

    const uniqueSources = new Set(articles.map(a => a.source)).size;
    document.getElementById("kpi-sources-active").textContent = `${uniqueSources}/20`;

    const uniqueLocations = new Set(articles.map(a => a.location).filter(l => l && l !== "General")).size;
    document.getElementById("kpi-locations-count").textContent = uniqueLocations;

    // Tendencia del día (variación porcentual simulada o real)
    const today = new Date().toISOString().slice(0, 10);
    const countToday = articles.filter(a => a.publish_date.slice(0, 10) === today).length;
    document.getElementById("kpi-trend-day").textContent = countToday > 0 ? `+${countToday}` : "Estable";

    // Último reporte detectado
    if (articles.length > 0) {
        const latestDate = new Date(articles[0].publish_date);
        document.getElementById("kpi-last-report").textContent = latestDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } else {
        document.getElementById("kpi-last-report").textContent = "--:--";
    }

    // Dibujar Nube de Palabras Clave
    const kwList = document.getElementById("kws-list");
    kwList.innerHTML = "";
    if (stats.top_keywords.length === 0) {
        kwList.innerHTML = `<p class="help-text">No hay palabras clave registradas.</p>`;
    } else {
        stats.top_keywords.forEach(kw => {
            const badge = document.createElement("div");
            badge.className = "keyword-badge";
            badge.innerHTML = `<i class="fa-solid fa-hashtag"></i> ${kw.keyword} <span class="count">${kw.count}</span>`;
            kwList.appendChild(badge);
        });
    }

    // Actualizar marcadores del Mapa
    updateMapMarkers(articles);

    // Renderizar los Gráficos Interactivos de Chart.js
    renderCharts(stats);
}

function calculateLocalStats(articles) {
    // 1. Clasificar por día (últimos 15 días)
    const byDayMap = {};
    const today = new Date();
    for (let i = 14; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().slice(0, 10);
        byDayMap[dStr] = 0;
    }
    articles.forEach(a => {
        const dateStr = a.publish_date.slice(0, 10);
        if (byDayMap[dateStr] !== undefined) byDayMap[dateStr]++;
    });
    const by_day = Object.keys(byDayMap).map(k => ({ day: k, count: byDayMap[k] }));

    // 2. Por Fuente (Top 10)
    const bySourceMap = {};
    articles.forEach(a => { bySourceMap[a.source] = (bySourceMap[a.source] || 0) + 1; });
    const by_source = Object.keys(bySourceMap)
        .map(k => ({ source: k, count: bySourceMap[k] }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);

    // 3. Por Tema
    const byTopicMap = {};
    articles.forEach(a => { byTopicMap[a.topic] = (byTopicMap[a.topic] || 0) + 1; });
    const by_topic = Object.keys(byTopicMap).map(k => ({ topic: k, count: byTopicMap[k] }));

    // 4. Por Relevancia
    const byRelevanceMap = {};
    articles.forEach(a => { byRelevanceMap[a.relevance] = (byRelevanceMap[a.relevance] || 0) + 1; });
    const by_relevance = Object.keys(byRelevanceMap).map(k => ({ relevance: k, count: byRelevanceMap[k] }));

    // 5. Por Ubicación
    const byLocationMap = {};
    articles.forEach(a => {
        if(a.location && a.location !== "General") {
            byLocationMap[a.location] = (byLocationMap[a.location] || 0) + 1;
        }
    });
    const by_location = Object.keys(byLocationMap).map(k => ({ location: k, count: byLocationMap[k] }));

    // 6. Alertas críticas
    const total_alerts = articles.filter(a => a.is_alert).length;

    // 7. Palabras clave más repetidas
    const kwCounts = {};
    articles.forEach(a => {
        if (a.keywords) {
            a.keywords.split(",").forEach(kw => {
                const clean = kw.trim();
                if (clean) kwCounts[clean] = (kwCounts[clean] || 0) + 1;
            });
        }
    });
    const top_keywords = Object.keys(kwCounts)
        .map(k => ({ keyword: k, count: kwCounts[k] }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);

    return { by_day, by_source, by_topic, by_relevance, by_location, top_keywords, total_alerts };
}

// ==========================================================================
// RENDERIZADO DEL FEED DE NOTICIAS (TAB FEED)
// ==========================================================================
async function loadFeedData() {
    const searchVal = document.getElementById("filter-search").value.toLowerCase();
    const relevanceVal = document.getElementById("filter-relevance").value;
    const topicVal = document.getElementById("filter-topic").value;
    const locationVal = document.getElementById("filter-location").value;
    const sourceTypeVal = document.getElementById("filter-source-type").value;
    const statusVal = document.getElementById("filter-status").value;
    const startDateVal = document.getElementById("filter-start-date").value;
    const endDateVal = document.getElementById("filter-end-date").value;

    const chkCritical = document.getElementById("chk-only-critical").checked;
    const chkNew = document.getElementById("chk-only-new").checked;
    const chkImportant = document.getElementById("chk-only-important").checked;

    let filtered = [];
    let totalRecords = 0;

    if (isDemoMode) {
        // Monitoreo manual client-side usando localStorage
        const allArticles = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
        
        filtered = allArticles.filter(art => {
            // Filtro de estado por defecto
            if (statusVal === "") {
                if (art.status === "Descartado") return false;
            } else {
                if (art.status !== statusVal) return false;
            }

            // Aplicar filtros básicos
            if (relevanceVal && art.relevance !== relevanceVal) return false;
            if (topicVal && art.topic !== topicVal) return false;
            if (locationVal && art.location !== locationVal) return false;
            if (sourceTypeVal && art.source_type !== sourceTypeVal) return false;

            // Filtros rápidos checkboxes
            if (chkCritical && !art.is_alert) return false;
            if (chkNew && art.status !== "Nuevo") return false;
            if (chkImportant && art.status !== "Importante") return false;

            // Rango de Fechas
            if (startDateVal && art.publish_date.slice(0,10) < startDateVal) return false;
            if (endDateVal && art.publish_date.slice(0,10) > endDateVal) return false;

            // Búsqueda textual
            if (searchVal) {
                const searchStr = `${art.title} ${art.summary} ${art.keywords} ${art.source}`.toLowerCase();
                if (!searchStr.includes(searchVal)) return false;
            }

            return true;
        });

        totalRecords = filtered.length;
        
        // Paginación manual en el navegador
        const start = (currentPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;
        articlesList = filtered.slice(start, end);
    } else {
        try {
            // Construir URL filtrada de API del servidor
            let url = `${API_BASE}/api/articles?limit=${recordsPerPage}&offset=${(currentPage - 1) * recordsPerPage}`;
            
            // Relevancia, tema, lugar, tipo, fechas
            if (relevanceVal) url += `&relevance=${relevanceVal}`;
            if (topicVal) url += `&topic=${topicVal}`;
            if (locationVal) url += `&location=${locationVal}`;
            if (sourceTypeVal) url += `&source_type=${sourceTypeVal}`;
            if (startDateVal) url += `&start_date=${startDateVal}`;
            if (endDateVal) url += `&end_date=${endDateVal}`;

            // Estatus específico
            if (statusVal) {
                url += `&status=${statusVal}`;
            } else if (chkNew) {
                url += `&status=Nuevo`;
            } else if (chkImportant) {
                url += `&status=Importante`;
            }

            // Filtros rápidos avanzados vía query search
            let finalSearch = searchVal;
            if (chkCritical) finalSearch += " is_alert"; // procesado del buscador del server
            
            if (finalSearch) url += `&search=${encodeURIComponent(finalSearch)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error();
            const data = await response.json();
            
            articlesList = data.articles;
            totalRecords = data.total;
        } catch (e) {
            console.error("Fallo de conexión API Articles.");
            return;
        }
    }

    // Dibujar la tabla
    renderNewsTable(articlesList);
    
    // Actualizar controles de paginación e información en el pie de la tabla
    document.getElementById("table-total-records").textContent = `Mostrando ${articlesList.length} de ${totalRecords} artículos encontrados.`;
    document.getElementById("page-indicator").textContent = `Página ${currentPage}`;
    
    document.getElementById("btn-prev-page").disabled = currentPage === 1;
    document.getElementById("btn-next-page").disabled = (currentPage * recordsPerPage) >= totalRecords;
}

function renderNewsTable(articles) {
    const tbody = document.getElementById("news-table-body");
    tbody.innerHTML = "";
    
    if (articles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px;" class="help-text"><i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 10px; display:block;"></i> No se encontraron registros. Intente limpiar los filtros.</td></tr>`;
        return;
    }
    
    articles.forEach(art => {
        const tr = document.createElement("tr");
        
        // Colores y bordes visuales según severidad
        if (art.relevance === "ALTA") {
            tr.className = "row-high-relevance";
        } else if (art.relevance === "MEDIA") {
            tr.className = "row-medium-relevance";
        }

        // Iconografía de fuentes
        let typeIcon = "fa-newspaper";
        if (art.source_type === "Red Social") typeIcon = "fa-share-nodes";
        else if (art.source_type === "Comunicado Oficial") typeIcon = "fa-building-shield";
        else if (art.source_type === "Video") typeIcon = "fa-video";

        const dateObj = new Date(art.publish_date);
        const formattedDate = dateObj.toLocaleDateString('es-CO') + " " + dateObj.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
        const isChecked = selectedArticleIds.has(art.id) ? "checked" : "";

        tr.innerHTML = `
            <td><input type="checkbox" class="article-select-checkbox" data-id="${art.id}" ${isChecked}></td>
            <td class="meta">${formattedDate}</td>
            <td>
                <div class="article-title-cell">
                    <a href="${art.url}" target="_blank" class="art-title-link">${art.title}</a>
                    <p class="article-summary-text">${art.summary || 'Sin resumen disponible.'}</p>
                    <div class="article-metadata-row">
                        <span class="source-badge"><i class="fa-solid ${typeIcon} source-type-icon"></i> ${art.source_type}</span>
                        ${art.keywords ? `<span class="meta-kws"><i class="fa-solid fa-tags"></i> KWs: ${art.keywords}</span>` : ''}
                        ${art.analyst_notes ? `<span class="meta-notes text-alert"><i class="fa-solid fa-comment-dots"></i> Observación analista</span>` : ''}
                    </div>
                </div>
            </td>
            <td><strong style="font-size: 11px;">${art.source}</strong></td>
            <td><span class="tag-location">${art.location || 'General'}</span></td>
            <td><span class="tag-topic">${art.topic || 'General'}</span></td>
            <td><span class="badge-relevance ${art.relevance.toLowerCase()}">${art.relevance}</span></td>
            <td><span class="badge-status status-${art.status.toLowerCase()}">${art.status}</span></td>
            <td>
                <div class="table-row-actions">
                    <button class="btn btn-icon btn-sm" onclick="openEditModal(${art.id})" title="Analizar Caso / Reporte Flash"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-icon btn-sm btn-danger" onclick="discardArticle(${art.id})" title="Descartar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        
        // Vincular checkbox individual
        tr.querySelector(".article-select-checkbox").addEventListener("change", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            if (e.target.checked) {
                selectedArticleIds.add(id);
            } else {
                selectedArticleIds.delete(id);
            }
            updateSelectedBadge();
        });

        tbody.appendChild(tr);
    });
}

// ==========================================================================
// RENDERIZADO DE ALERTAS CRÍTICAS (TAB ALERTAS)
// ==========================================================================
async function loadAlertsData() {
    let alerts = [];

    if (isDemoMode) {
        alerts = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]")
            .filter(a => a.is_alert && a.status !== "Descartado");
    } else {
        try {
            const response = await fetch(`${API_BASE}/api/alerts`);
            if (!response.ok) throw new Error();
            alerts = await response.json();
        } catch (e) {
            console.error("Fallo de conexión API Alertas.");
            return;
        }
    }

    // 1. Ticker superior
    const tickerScroll = document.getElementById("ticker-scroll");
    const tickerContainer = document.getElementById("ticker-container");
    tickerScroll.innerHTML = "";
    
    if (alerts.length === 0) {
        tickerContainer.style.display = "none";
    } else {
        tickerContainer.style.display = "flex";
        
        // Rellenar ticker (dos veces para ciclo fluido infinito)
        const populateTicker = () => {
            alerts.forEach(al => {
                const item = document.createElement("div");
                item.className = "ticker-item";
                item.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-alert"></i> <span><strong>${al.source}:</strong> <a href="${al.url}" target="_blank">${al.title}</a> en <strong>${al.location}</strong></span>`;
                tickerScroll.appendChild(item);
            });
        };
        populateTicker();
        populateTicker();
    }

    // 2. Grilla de alertas críticas
    const grid = document.getElementById("alerts-grid");
    grid.innerHTML = "";
    
    if (alerts.length === 0) {
        grid.innerHTML = `<div class="alerts-empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--border-radius-lg); border: 1px dashed var(--border-color);"><i class="fa-solid fa-shield-check" style="font-size: 36px; color: #10b981; display:block; margin-bottom: 10px;"></i> No se registran alertas críticas activas de seguridad de fuentes abiertas. Sin incidencias de orden público.</div>`;
        return;
    }

    alerts.forEach(al => {
        const card = document.createElement("div");
        card.className = "alert-card";
        
        const dateObj = new Date(al.publish_date);
        const timeStr = dateObj.toLocaleDateString('es-CO') + " " + dateObj.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});

        card.innerHTML = `
            <div class="alert-card-header">
                <span class="alert-card-source"><i class="fa-solid fa-bullhorn"></i> ${al.source}</span>
                <span class="alert-card-time">${timeStr}</span>
            </div>
            <div class="alert-card-body">
                <h3>${al.title}</h3>
                <p>${al.summary || 'Sin descripción detallada.'}</p>
            </div>
            <div class="alert-card-footer">
                <div class="alert-tags">
                    <span class="tag-location">${al.location}</span>
                    <span class="tag-topic">${al.topic}</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="openEditModal(${al.id})"><i class="fa-solid fa-shield-halved"></i> Gestionar</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================================================
// RENDERIZADO DE LA PESTAÑA FUENTES (TAB FUENTES)
// ==========================================================================
async function loadSourcesData() {
    let sources = [];
    let articles = [];

    // Cargar catálogo configurado
    if (isDemoMode) {
        sources = backupSources;
        articles = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]").filter(a => a.status !== "Descartado");
    } else {
        try {
            // Intentar leer config/sources.json
            const resConfig = await fetch(`config/sources.json`);
            if (resConfig.ok) {
                const confData = await resConfig.json();
                sources = confData.monitored_sources || backupSources;
            } else {
                sources = backupSources;
            }

            const resArticles = await fetch(`${API_BASE}/api/articles?limit=1000`);
            const artData = await resArticles.json();
            articles = artData.articles;
        } catch (e) {
            sources = backupSources;
        }
    }

    // Contar las fuentes e inyectar tabla
    const tbody = document.getElementById("sources-table-body");
    tbody.innerHTML = "";

    document.getElementById("sources-total-count").textContent = sources.length;
    
    let activeCount = 0;
    let tokenCount = 0;

    sources.forEach(src => {
        // Calcular registros capturados localmente del feed de la fuente
        const count = articles.filter(a => a.source.toLowerCase().includes(src.name.split(" ")[0].toLowerCase()) || a.source_type === src.type).length;
        
        if (src.status === "Activa") activeCount++;
        if (src.status === "Configurable") tokenCount++;

        let statusClass = src.status.toLowerCase();
        let connClass = "ok";
        let connIcon = "fa-circle-check";
        
        if (src.connection_state.includes("Requiere") || src.connection_state.includes("API Key")) {
            connClass = "warning";
            connIcon = "fa-circle-exclamation";
        } else if (src.connection_state.includes("No configurada")) {
            connClass = "error";
            connIcon = "fa-circle-xmark";
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${src.name}</strong></td>
            <td><span class="tag-topic">${src.type}</span></td>
            <td><span class="meta">${src.target}</span></td>
            <td><span class="badge-source-status ${statusClass}">${src.status}</span></td>
            <td><span class="status-pill ${connClass}"><i class="fa-solid ${connIcon}"></i> ${src.connection_state}</span></td>
            <td class="meta">${src.update_frequency}</td>
            <td><strong style="color: #3b82f6;">${count}</strong></td>
            <td><span class="meta" style="font-size:11px;">${src.observations}</span></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("sources-active-count").textContent = activeCount;
    document.getElementById("sources-token-count").textContent = tokenCount;
}

// ==========================================================================
// WORKSPACE Y CONSTRUCCION DEL REPORTE FLASH CTI
// ==========================================================================
function updateSelectedBadge() {
    const count = selectedArticleIds.size;
    document.getElementById("menu-selected-badge").textContent = count;
    document.getElementById("menu-selected-badge").style.display = count > 0 ? "block" : "none";
    document.getElementById("selected-count-text").textContent = `${count} seleccionadas para Reporte Flash`;
}

async function getSelectedArticles() {
    if (selectedArticleIds.size === 0) return [];
    const list = [];
    
    if (isDemoMode) {
        const localData = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
        selectedArticleIds.forEach(id => {
            const found = localData.find(a => a.id === id);
            if (found) list.push(found);
        });
    } else {
        for (let id of selectedArticleIds) {
            try {
                const response = await fetch(`${API_BASE}/api/articles/${id}`);
                if (response.ok) {
                    const art = await response.json();
                    list.push(art);
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
    return list;
}

async function updateReportSelectedList() {
    const listContainer = document.getElementById("report-selected-list");
    listContainer.innerHTML = "";
    
    const selected = await getSelectedArticles();
    
    if (selected.length === 0) {
        listContainer.innerHTML = `<p class="help-text">Ninguna noticia seleccionada. Vaya a la pestaña "Feed de Noticias" y marque las casillas correspondientes.</p>`;
        return;
    }

    selected.forEach(art => {
        const item = document.createElement("div");
        item.className = "selected-art-item";
        item.innerHTML = `
            <h4>${art.title}</h4>
            <div class="selected-art-meta">
                <span>${art.source}</span>
                <span class="${art.relevance.toLowerCase()}">${art.relevance}</span>
            </div>
            <button class="btn btn-danger btn-sm btn-block" style="padding: 2px; font-size:10px;" onclick="removeSelectedArticle(${art.id})"><i class="fa-solid fa-xmark"></i> Quitar</button>
        `;
        listContainer.appendChild(item);
    });
}

function removeSelectedArticle(id) {
    selectedArticleIds.delete(id);
    updateSelectedBadge();
    updateReportSelectedList();
    renderReportPreview();
    
    const cb = document.querySelector(`.article-select-checkbox[data-id="${id}"]`);
    if (cb) cb.checked = false;
}

async function renderReportPreview() {
    const previewContainer = document.getElementById("doc-content-preview");
    previewContainer.innerHTML = "";
    
    const selected = await getSelectedArticles();
    
    if (selected.length === 0) {
        previewContainer.innerHTML = `<p class="help-text" style="text-align: center; padding: 40px; font-style: italic;">Seleccione noticias en el feed de monitoreo para visualizar la compilación.</p>`;
        return;
    }

    const reportPeriodo = document.getElementById("report-periodo").value;
    const reportElaboro = document.getElementById("report-elaboro").value;

    selected.forEach((art, index) => {
        const block = document.createElement("div");
        block.className = "doc-article-case";
        
        const dateObj = new Date(art.publish_date);
        const formattedDate = dateObj.toLocaleDateString('es-CO') + " " + dateObj.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});

        block.innerHTML = `
            <div class="doc-case-title">NOTICIA CRÍTICA / CASO N° ${index + 1}: ${art.title.toUpperCase()}</div>
            
            <div class="doc-field"><span class="doc-field-label">Fecha y hora del reporte:</span><span class="doc-field-value">${formattedDate}</span></div>
            <div class="doc-field"><span class="doc-field-label">Periodo monitoreado:</span><span class="doc-field-value">${reportPeriodo}</span></div>
            <div class="doc-field"><span class="doc-field-label">Tema principal:</span><span class="doc-field-value">${art.topic}</span></div>
            <div class="doc-field"><span class="doc-field-label">Nivel de relevancia:</span><span class="doc-field-value relevance-${art.relevance.toLowerCase()}">${art.relevance}</span></div>
            <div class="doc-field"><span class="doc-field-label">Fuente original:</span><span class="doc-field-value">${art.source}</span></div>
            <div class="doc-field"><span class="doc-field-label">Enlace de publicación:</span><span class="doc-field-value" style="color: #3b82f6; text-decoration: underline;">${art.url}</span></div>
            <div class="doc-field"><span class="doc-field-label">Lugar relacionado:</span><span class="doc-field-value">${art.location || 'Amazonas'}</span></div>
            
            <div class="doc-field"><span class="doc-field-label">Resumen OSINT:</span></div>
            <div class="doc-text-block">${art.summary || 'Sin descripción disponible.'}</div>
            
            <div class="doc-field"><span class="doc-field-label">Análisis técnico preliminar CTI:</span></div>
            <div class="doc-text-block">${art.analysis_preliminary || 'Bajo análisis preliminar de policía judicial en base de fuentes abiertas.'}</div>
            
            <div class="doc-field"><span class="doc-field-label">Posible afectación para el Amazonas colombiano:</span></div>
            <div class="doc-text-block">${art.regional_impact || 'Se mantiene monitoreo preventivo por parte de analistas de inteligencia.'}</div>
            
            <div class="doc-field"><span class="doc-field-label">Palabras clave detectadas:</span><span class="doc-field-value">${art.keywords || 'Sin tags'}</span></div>
            
            <div class="doc-field"><span class="doc-field-label">Observaciones del analista:</span></div>
            <div class="doc-text-block">${art.analyst_notes || 'Sin observaciones registradas.'}</div>
            
            <div class="doc-field"><span class="doc-field-label">Elaboró:</span><span class="doc-field-value">${reportElaboro}</span></div>
        `;
        previewContainer.appendChild(block);
        
        if (index < selected.length - 1) {
            const separator = document.createElement("hr");
            separator.style.border = "none";
            separator.style.borderTop = "2px dashed #cbd5e1";
            separator.style.margin = "30px 0";
            previewContainer.appendChild(separator);
        }
    });
}

document.getElementById("report-periodo").addEventListener("input", renderReportPreview);
document.getElementById("report-elaboro").addEventListener("input", renderReportPreview);

// ==========================================================================
// FORMULARIOS DE DETALLES, CRUD Y EDICION (CRUD LOCAL LOCALSTORAGE)
// ==========================================================================
async function openEditModal(art_id) {
    let art = null;
    if (isDemoMode) {
        const localData = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
        art = localData.find(a => a.id === art_id);
    } else {
        try {
            const response = await fetch(`${API_BASE}/api/articles/${art_id}`);
            if (response.ok) art = await response.json();
        } catch (e) {
            alert("Error de conexión al cargar el artículo.");
            return;
        }
    }

    if (!art) return;

    const dateObj = new Date(art.publish_date);
    document.getElementById("modal-art-date").innerHTML = `<i class="fa-solid fa-calendar"></i> Captura: ${dateObj.toLocaleString('es-CO')} | Canal: <strong>${art.source}</strong> (${art.source_type})`;
    document.getElementById("modal-art-title").textContent = art.title;
    document.getElementById("modal-art-summary").textContent = art.summary || "Sin resumen.";
    document.getElementById("modal-art-link").href = art.url;
    
    // Rellenar formulario editable
    document.getElementById("edit-art-id").value = art.id;
    document.getElementById("edit-relevance").value = art.relevance;
    document.getElementById("edit-topic").value = art.topic;
    document.getElementById("edit-status").value = art.status;
    document.getElementById("edit-location").value = art.location || "";
    document.getElementById("edit-preliminary").value = art.analysis_preliminary || "";
    document.getElementById("edit-impact").value = art.regional_impact || "";
    document.getElementById("edit-notes").value = art.analyst_notes || "";
    document.getElementById("edit-elaborated").value = art.elaborated_by || "Analista CTI";
    
    document.getElementById("edit-modal").classList.add("active");
}

function closeModal() {
    document.getElementById("edit-modal").classList.remove("active");
}

async function submitArticleEdit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("edit-art-id").value);
    
    const bodyData = {
        relevance: document.getElementById("edit-relevance").value,
        topic: document.getElementById("edit-topic").value,
        status: document.getElementById("edit-status").value,
        location: document.getElementById("edit-location").value,
        analysis_preliminary: document.getElementById("edit-preliminary").value,
        regional_impact: document.getElementById("edit-impact").value,
        analyst_notes: document.getElementById("edit-notes").value,
        elaborated_by: document.getElementById("edit-elaborated").value
    };

    if (isDemoMode) {
        // Guardado local persistido en LocalStorage
        const localData = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
        const index = localData.findIndex(a => a.id === id);
        if (index !== -1) {
            // Unir y guardar
            localData[index] = { ...localData[index], ...bodyData };
            localStorage.setItem("amazonas_demo_articles", JSON.stringify(localData));
            
            closeModal();
            loadFeedData();
            loadAlertsData();
            loadDashboardData();
        } else {
            alert("Artículo no encontrado en base de datos local.");
        }
    } else {
        try {
            const response = await fetch(`${API_BASE}/api/articles/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                closeModal();
                loadFeedData();
                loadAlertsData();
                loadDashboardData();
            } else {
                alert("Error al guardar cambios en el servidor.");
            }
        } catch (e) {
            alert("Error al conectar con el servidor.");
        }
    }
}

async function discardArticle(art_id) {
    if (!confirm("¿Está seguro de que desea mover este reporte al histórico de descartados?")) return;
    
    if (isDemoMode) {
        const localData = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
        const index = localData.findIndex(a => a.id === art_id);
        if (index !== -1) {
            localData[index].status = "Descartado";
            localStorage.setItem("amazonas_demo_articles", JSON.stringify(localData));
            
            loadFeedData();
            loadAlertsData();
            loadDashboardData();
        }
    } else {
        try {
            const response = await fetch(`${API_BASE}/api/articles/${art_id}`, { method: "DELETE" });
            if (response.ok) {
                loadFeedData();
                loadAlertsData();
                loadDashboardData();
            } else {
                alert("Error al descartar.");
            }
        } catch (e) {
            alert("Error de red.");
        }
    }
}

async function submitManualIngest(e) {
    e.preventDefault();
    
    const title = document.getElementById("manual-title").value.trim();
    const url = document.getElementById("manual-url").value.trim();
    const source = document.getElementById("manual-source").value.trim();
    const source_type = document.getElementById("manual-source-type").value;
    const topic = document.getElementById("manual-topic").value;
    const location = document.getElementById("manual-location").value.trim() || "General";
    const relevance = document.getElementById("manual-relevance").value;
    const summary = document.getElementById("manual-summary").value.trim();
    const analyst_notes = document.getElementById("manual-notes").value.trim();

    // Comprobar palabras de seguridad críticas en título/resumen para activar bandera de alerta
    const alertKeywords = ["homicidio", "asesinato", "captura", "atentado", "narcotráfico", "incautación", "droga", "armas", "emergencia", "disidencias", "gao", "bloqueo", "secuestro", "extorsión"];
    const fullTextSearch = `${title} ${summary}`.toLowerCase();
    const is_alert = alertKeywords.some(kw => fullTextSearch.includes(kw));

    const newArticle = {
        id: isDemoMode ? Date.now() : 0, // Id temporal para simulación
        title,
        url,
        source,
        source_type,
        publish_date: new Date().toISOString(),
        keywords: topic + ", " + location,
        location,
        relevance,
        topic,
        status: "Nuevo",
        is_alert,
        summary,
        analyst_notes,
        analysis_preliminary: "Ingresado manualmente por el analista judicial.",
        regional_impact: "Bajo monitoreo preventivo en la base de datos.",
        elaborated_by: "Analista CTI Amazonas"
    };

    if (isDemoMode) {
        const localData = JSON.parse(localStorage.getItem("amazonas_demo_articles") || "[]");
        
        // Evitar duplicados por URL
        if (localData.some(a => a.url === url)) {
            alert("Ya existe un caso registrado con ese mismo enlace de referencia.");
            return;
        }
        
        localData.unshift(newArticle);
        localStorage.setItem("amazonas_demo_articles", JSON.stringify(localData));
        
        alert("Reporte manual guardado con éxito en base de datos local (Demo).");
        document.getElementById("manual-ingest-form").reset();
        
        // Si la novedad es crítica, emitir alerta
        if (is_alert) playAlertSound();

        loadFeedData();
        loadDashboardData();
    } else {
        try {
            const response = await fetch(`${API_BASE}/api/articles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newArticle)
            });

            if (response.ok) {
                alert("Novedad guardada exitosamente en el servidor.");
                document.getElementById("manual-ingest-form").reset();
                loadFeedData();
                loadDashboardData();
            } else {
                const err = await response.json();
                alert(`Error: ${err.detail || "Error en guardado."}`);
            }
        } catch (e) {
            alert("Error al conectar con el servidor.");
        }
    }
}

// ==========================================================================
// EXPORTACION DETALLADA EN CLIENTE (FALLBACK STANDALONE EXPORTS)
// ==========================================================================
async function triggerExport(format) {
    if (selectedArticleIds.size === 0) {
        alert("Debe seleccionar al menos un caso marcando la casilla de la fila en la tabla del feed.");
        return;
    }

    const selected = await getSelectedArticles();
    
    // Si estamos en vivo en el servidor, usamos la API del Backend.
    // De lo contrario, o si falla la API, realizamos exportación directa vía JS en el cliente (Wow Factor).
    if (!isDemoMode) {
        try {
            const response = await fetch(`${API_BASE}/api/export`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: Array.from(selectedArticleIds),
                    format: format
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                let filename = `Reporte_Monitoreo_Amazonas_${new Date().toISOString().slice(0,10)}.${format === "excel" ? "xlsx" : format === "word" ? "docx" : format}`;
                downloadBlob(blob, filename);
                return;
            }
        } catch (e) {
            console.warn("Fallo en exportación de servidor. Usando fallback de cliente.");
        }
    }

    // --- FALLBACK EXPORTACION CLIENT-SIDE ---
    const dateStamp = new Date().toISOString().slice(0, 10);
    
    if (format === "json") {
        const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
        downloadBlob(blob, `Reporte_Monitoreo_Amazonas_${dateStamp}.json`);
    } 
    else if (format === "csv") {
        const headers = ["Fecha Detección", "Título", "Enlace", "Fuente", "Tipo Fuente", "Ubicación", "Tema", "Relevancia", "Estado", "Análisis Preliminar", "Notas"];
        const rows = selected.map(art => [
            art.publish_date,
            `"${art.title.replace(/"/g, '""')}"`,
            art.url,
            art.source,
            art.source_type,
            art.location || "General",
            art.topic,
            art.relevance,
            art.status,
            `"${(art.analysis_preliminary || "").replace(/"/g, '""')}"`,
            `"${(art.analyst_notes || "").replace(/"/g, '""')}"`
        ]);
        
        const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `Reporte_Monitoreo_Amazonas_${dateStamp}.csv`);
    } 
    else if (format === "excel") {
        // Usar librería SheetJS (XLSX) importada vía CDN
        try {
            const ws = XLSX.utils.json_to_sheet(selected.map(art => ({
                ID: art.id,
                Fecha: art.publish_date,
                Título: art.title,
                Enlace: art.url,
                Fuente: art.source,
                Tipo_Fuente: art.source_type,
                Ubicación: art.location,
                Tema: art.topic,
                Relevancia: art.relevance,
                Estado: art.status,
                Palabras_Clave: art.keywords,
                Análisis_Preliminar: art.analysis_preliminary || "",
                Afectación_Amazonas: art.regional_impact || "",
                Observaciones: art.analyst_notes || "",
                Elaboró: art.elaborated_by || ""
            })));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Monitoreo");
            
            // Escribir archivo y gatillar descarga
            XLSX.writeFile(wb, `Reporte_Monitoreo_Amazonas_${dateStamp}.xlsx`);
        } catch (e) {
            alert("Error al cargar la librería XLSX (SheetJS). Asegúrese de estar conectado a internet.");
        }
    } 
    else if (format === "word") {
        // Generar un documento de Word en base a estructura XML/HTML limpia que Word lee perfectamente
        const reportPeriodo = document.getElementById("report-periodo").value;
        const reportElaboro = document.getElementById("report-elaboro").value;
        
        let casesHtml = "";
        selected.forEach((art, index) => {
            const dateObj = new Date(art.publish_date);
            const formattedDate = dateObj.toLocaleDateString('es-CO') + " " + dateObj.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
            
            casesHtml += `
                <div style="margin-bottom: 30px; font-family: Arial, sans-serif; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
                    <h2 style="font-size: 14pt; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">CASO N° ${index + 1}: ${art.title.toUpperCase()}</h2>
                    <table style="width: 100%; font-size: 10pt; margin-top: 10px; border-collapse: collapse;">
                        <tr><td style="width: 150px; font-weight: bold; padding: 4px 0;">Fecha del reporte:</td><td>${formattedDate}</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Periodo monitoreado:</td><td>${reportPeriodo}</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Tema principal:</td><td>${art.topic}</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Relevancia:</td><td style="color: red; font-weight: bold;">${art.relevance}</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Fuente original:</td><td>${art.source}</td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Enlace original:</td><td><a href="${art.url}">${art.url}</a></td></tr>
                        <tr><td style="font-weight: bold; padding: 4px 0;">Lugar relacionado:</td><td>${art.location || 'Amazonas'}</td></tr>
                    </table>
                    
                    <h3 style="font-size: 11pt; color: #1e3a8a; margin-top: 15px;">Resumen Monitoreo (OSINT):</h3>
                    <p style="font-size: 10pt; line-height: 1.5; background-color: #f8fafc; padding: 8px;">${art.summary || 'Sin descripción.'}</p>
                    
                    <h3 style="font-size: 11pt; color: #1e3a8a; margin-top: 15px;">Análisis Preliminar Judicial:</h3>
                    <p style="font-size: 10pt; line-height: 1.5; background-color: #f8fafc; padding: 8px;">${art.analysis_preliminary || 'Bajo monitoreo preventivo.'}</p>
                    
                    <h3 style="font-size: 11pt; color: #1e3a8a; margin-top: 15px;">Posible Afectación Territorial:</h3>
                    <p style="font-size: 10pt; line-height: 1.5; background-color: #f8fafc; padding: 8px;">${art.regional_impact || 'Se mantiene el análisis de riesgos.'}</p>
                    
                    <p style="font-size: 9pt; color: #64748b; margin-top: 10px;"><strong>Palabras clave:</strong> ${art.keywords || 'Amazonas'}</p>
                    <p style="font-size: 10pt; margin-top: 15px;"><strong>Elaboró:</strong> ${reportElaboro}</p>
                </div>
            `;
        });

        const htmlDocument = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <title>Reporte Flash CTI</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                    </w:WordDocument>
                </xml>
                <![endif]-->
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 16pt; margin: 0; color: #1e3a8a;">DIRECCIÓN SECCIONAL AMAZONAS</h1>
                    <h2 style="font-size: 13pt; margin: 5px 0; color: #1e3a8a;">SECCIÓN DE POLICÍA JUDICIAL CTI AMAZONAS</h2>
                    <h3 style="font-size: 11pt; margin: 0; font-weight: normal; text-transform: uppercase;">Reporte Flash de Monitoreo de Medios</h3>
                    <div style="border-bottom: 3px double #1e3a8a; margin-top: 15px;"></div>
                </div>
                ${casesHtml}
            </body>
            </html>
        `;

        const blob = new Blob(["\ufeff" + htmlDocument], { type: "application/msword" });
        downloadBlob(blob, `Reporte_Flash_CTI_${dateStamp}.doc`);
    } 
    else if (format === "pdf") {
        // En modo local, abrimos directamente el diálogo de impresión con hojas de estilos optimizadas.
        window.print();
    }
}

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ==========================================================================
// RENDERIZADO DE GRÁFICOS (CHART.JS CONFIG)
// ==========================================================================
function getChartColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
        text: isDark ? "#cbd5e1" : "#4b5563",
        grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        primary: "#3b82f6",
        alta: "hsl(355, 78%, 56%)",
        media: "hsl(45, 100%, 51%)",
        baja: "hsl(150, 60%, 40%)",
        backgrounds: [
            "rgba(79, 70, 229, 0.75)", 
            "rgba(13, 148, 136, 0.75)", 
            "rgba(225, 29, 72, 0.75)", 
            "rgba(37, 99, 235, 0.75)", 
            "rgba(217, 119, 6, 0.75)",  
            "rgba(16, 185, 129, 0.75)", 
            "rgba(236, 72, 153, 0.75)", 
            "rgba(168, 85, 247, 0.75)", 
            "rgba(249, 115, 22, 0.75)"  
        ]
    };
}

function updateChartsTheme() {
    // Repintar gráficos con la nueva paleta de color (Modo Oscuro / Claro)
    loadDashboardData();
}

function renderCharts(stats) {
    const theme = getChartColors();
    
    if (chartTrend) chartTrend.destroy();
    if (chartTopic) chartTopic.destroy();
    if (chartLocation) chartLocation.destroy();
    if (chartRelevance) chartRelevance.destroy();
    if (chartSource) chartSource.destroy();

    // 1. Gráfico de Tendencia Temporal (Línea)
    const ctxTrend = document.getElementById("chart-trend");
    if (ctxTrend) {
        chartTrend = new Chart(ctxTrend.getContext("2d"), {
            type: 'line',
            data: {
                labels: stats.by_day.map(d => {
                    const date = new Date(d.day + "T00:00:00");
                    return date.toLocaleDateString('es-CO', {day: 'numeric', month: 'short'});
                }),
                datasets: [{
                    label: 'Publicaciones',
                    data: stats.by_day.map(d => d.count),
                    borderColor: theme.primary,
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: theme.primary
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: theme.grid }, ticks: { color: theme.text } },
                    y: { grid: { color: theme.grid }, ticks: { color: theme.text, precision: 0 } }
                }
            }
        });
    }

    // 2. Gráfico de Distribución Temática (Dona)
    const ctxTopic = document.getElementById("chart-topic");
    if (ctxTopic) {
        chartTopic = new Chart(ctxTopic.getContext("2d"), {
            type: 'doughnut',
            data: {
                labels: stats.by_topic.map(t => t.topic),
                datasets: [{
                    data: stats.by_topic.map(t => t.count),
                    backgroundColor: theme.backgrounds,
                    borderWidth: 1,
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: theme.text, boxWidth: 12, font: { size: 10 } }
                    }
                }
            }
        });
    }

    // 3. Gráfico por Municipio (Barras)
    const ctxLocation = document.getElementById("chart-location");
    if (ctxLocation) {
        chartLocation = new Chart(ctxLocation.getContext("2d"), {
            type: 'bar',
            data: {
                labels: stats.by_location.map(l => l.location),
                datasets: [{
                    data: stats.by_location.map(l => l.count),
                    backgroundColor: 'rgba(13, 148, 136, 0.75)',
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: theme.text } },
                    y: { grid: { color: theme.grid }, ticks: { color: theme.text, precision: 0 } }
                }
            }
        });
    }

    // 4. Gráfico por Relevancia (Pie)
    const ctxRelevance = document.getElementById("chart-relevance");
    if (ctxRelevance) {
        const relevanceColors = stats.by_relevance.map(r => {
            if (r.relevance === "ALTA") return theme.alta;
            if (r.relevance === "MEDIA") return theme.media;
            return theme.baja;
        });

        chartRelevance = new Chart(ctxRelevance.getContext("2d"), {
            type: 'pie',
            data: {
                labels: stats.by_relevance.map(r => r.relevance),
                datasets: [{
                    data: stats.by_relevance.map(r => r.count),
                    backgroundColor: relevanceColors,
                    borderWidth: 1,
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: theme.text, boxWidth: 12 }
                    }
                }
            }
        });
    }

    // 5. Gráfico de Fuentes (Barras Horizontales)
    const ctxSource = document.getElementById("chart-source");
    if (ctxSource) {
        chartSource = new Chart(ctxSource.getContext("2d"), {
            type: 'bar',
            data: {
                labels: stats.by_source.map(s => s.source),
                datasets: [{
                    data: stats.by_source.map(s => s.count),
                    backgroundColor: 'rgba(79, 70, 229, 0.75)',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: theme.grid }, ticks: { color: theme.text, precision: 0 } },
                    y: { grid: { display: false }, ticks: { color: theme.text } }
                }
            }
        });
    }
}

// ==========================================================================
// CONFIGURACION CREDENCIALES EN MODO VIVO (NO APLICA EN OFFLINE)
// ==========================================================================
async function loadApiConfig() {
    if (isDemoMode) return;
    try {
        const response = await fetch(`${API_BASE}/api/config`);
        if (!response.ok) return;
        const config = await response.json();
        
        const setLabel = (id, val) => {
            const el = document.getElementById(id);
            if (val === "No configurada") {
                el.className = "key-status missing";
                el.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Inactiva (Usando feeds públicos)`;
            } else {
                el.className = "key-status success";
                el.innerHTML = `<i class="fa-solid fa-circle-check"></i> Activa: ${val}`;
            }
        };

        setLabel("status-youtube", config.YOUTUBE_API_KEY);
        setLabel("status-x", config.X_BEARER_TOKEN);
        setLabel("status-facebook", config.FACEBOOK_ACCESS_TOKEN);
        setLabel("status-instagram", config.INSTAGRAM_ACCESS_TOKEN);
    } catch (e) {
        console.error("Error cargando configuración.");
    }
}

async function saveApiConfig(e) {
    e.preventDefault();
    if (isDemoMode) {
        alert("La configuración de API Keys reales solo está disponible en MODO PRODUCCIÓN (conectado al backend).");
        return;
    }

    const data = {};
    const keys = ["youtube", "x", "facebook", "instagram"];
    
    keys.forEach(k => {
        const input = document.getElementById(`key-${k}`);
        if (input.value && input.value.trim()) {
            const dbKeyName = k === "youtube" ? "YOUTUBE_API_KEY" : 
                            k === "x" ? "X_BEARER_TOKEN" : 
                            k === "facebook" ? "FACEBOOK_ACCESS_TOKEN" : 
                            "INSTAGRAM_ACCESS_TOKEN";
            data[dbKeyName] = input.value.trim();
        }
    });

    if (Object.keys(data).length === 0) {
        alert("Ingrese al menos una credencial para guardar.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("Credenciales de API guardadas correctamente en la base de datos.");
            keys.forEach(k => document.getElementById(`key-${k}`).value = "");
            loadApiConfig();
        } else {
            alert("Error al guardar credenciales.");
        }
    } catch (e) {
        alert("Error de conexión al guardar.");
    }
}
