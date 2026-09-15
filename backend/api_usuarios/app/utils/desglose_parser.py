import re
from datetime import date

# ==========================================
# PARSER DE PDF "DESGLOSE DE PRODUCCION"
# ==========================================
# Este modulo interpreta el formato de exportacion de desglose (el que
# usa como referencia el documento "El Ultimo Horizonte"): agrupado por
# Semana > Dia > Locacion > Escena, con bloques "Departamento: item1,
# item2, ..." por escena. A partir de ese texto reconstruye, por cada
# escena, sus campos basicos (numero, modo de vista, encabezado,
# momento del dia, dia dramatico, fecha, locacion) y la lista de
# requerimientos por departamento (uno por cada item separado por comas,
# para que el conteo por departamento coincida con las etiquetas que
# se muestran en pantalla, ej. "Props (3)").

MESES_ES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12
}

# Etiquetas de departamento reconocidas en el documento -> nombre normalizado
# que usa el catalogo interno (schemas/desglose_schema.DEPARTAMENTOS_DESGLOSE)
NORMALIZAR_DEPARTAMENTO = {
    "elenco": "Elenco",
    "extras / bg": "Extras / BG",
    "extras/bg": "Extras / BG",
    "bits": "Bits",
    "props": "Props",
    "sfx": "SFX",
    "arte": "Arte",
    "vestuario": "Vestuario",
    "camara": "Cámara",
    "cámara": "Cámara",
    "maquillaje fx": "Maquillaje FX",
    "maquillaje": "Maquillaje y Pelo",
    "sonido": "Sonido",
    "stunts": "Stunts",
    "vfx": "VFX",
    "crew adicional": "Crew Adicional",
    "vehiculos": "Vehículos",
    "vehículos": "Vehículos",
    "animales": "Animales",
    "armas": "Armas",
    "notas": "Notas",
}

_DEPTS_PATRON = r"Elenco|Extras\s*/\s*BG|Bits|Props|SFX|Arte|Vestuario|C[aá]mara|Maquillaje FX|Maquillaje|Sonido|Stunts|VFX|Crew Adicional|Veh[ií]culos|Animales|Armas|Notas"

DEPT_LABEL_GLOBAL = re.compile(rf"(?:^|\s)({_DEPTS_PATRON}):", re.IGNORECASE)
MODO_VISTA_RE = re.compile(r"^(INT/EXT|EXT/INT|INT|EXT)\b\s*(.*)$", re.IGNORECASE)
MOMENTO_RE = re.compile(r"\b(D[ií]a|Noche|Amanecer|Atardecer|Ma[ñn]ana|Tarde)\b")
DIA_HEADER_RE = re.compile(
    r"^D[ÍI]A\s+(\d+)\s*·\s*[^,]+,\s*(\d{1,2})\s+de\s+(\w+)\s+(\d{4})\s*·\s*([^·]+)·(?:\s*Llamado:\s*([^·]+)·)?",
    re.IGNORECASE
)
SCENE_START_RE = re.compile(r"^(\d{1,4})(?:\s+(INT/EXT|EXT/INT|INT|EXT)\b(.*))?$", re.IGNORECASE)
FIN_DIA_RE = re.compile(r"^Fin\s+D[ií]a", re.IGNORECASE)
SEMANA_RE = re.compile(r"^SEMANA\s+(\d+)", re.IGNORECASE)
PAGCOUNT_RE = re.compile(r"^\d*\s*\d/8$")
PAGCOUNT_TRAIL_RE = re.compile(r"\s*\d*\s*\d/8\s*$")


PAGCOUNT_MID_RE = re.compile(r"\d{0,2}\s?\d/8")

_MOMENTOS_TXT = "Amanecer|Atardecer|Noche|Ma[ñn]ana|Tarde|D[ií]a"

# Ruido tipico de un PDF "impreso desde el navegador": marca de fecha/hora,
# "about:blank" y el encabezado de la tabla repetido en cada salto de
# pagina. Se descarta linea por linea antes de interpretar el contenido.
_RUIDO_LINEA_RE = re.compile(
    r"^(?:\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}.*|about:blank.*|SC\.\s*INT/EXT.*P[ÁA]GS\.?|Documento de uso interno.*|⚠.*)$",
    re.IGNORECASE
)


def _limpiar_texto(texto: str) -> str:
    # Algunos extractores de PDF pegan el momento del dia directamente a
    # la ultima palabra del encabezado quel precede (ej.
    # "TRASEROAmanecer"). Se separa con un espacio para que el resto del
    # parser pueda reconocerlo igual que si viniera bien espaciado.
    texto = re.sub(rf"(?<=[a-zA-ZñÑáéíóúÁÉÍÓÚ])({_MOMENTOS_TXT})\b", r" \1", texto)

    lineas_limpias = [
        linea for linea in texto.splitlines()
        if not _RUIDO_LINEA_RE.match(linea.strip())
    ]
    return "\n".join(lineas_limpias)


def _normalizar_departamento(etiqueta: str) -> str:
    clave = re.sub(r"\s+", " ", etiqueta.strip().lower())
    return NORMALIZAR_DEPARTAMENTO.get(clave, etiqueta.strip())


def _parse_bloque_escena(numero, texto_bloque, dia, fecha, locacion):
    m_modo = MODO_VISTA_RE.match(texto_bloque.strip())
    if not m_modo:
        return None, None

    modo_vista = m_modo.group(1).upper()
    resto = m_modo.group(2)

    m_momento = MOMENTO_RE.search(resto)
    if not m_momento:
        return None, None

    encabezado = resto[:m_momento.start()].strip(" -")
    momento_dia = m_momento.group(1).capitalize()
    contenido = resto[m_momento.end():].strip()

    # El conteo de paginas ("1 2/8", "4/8", ...) marca el final del
    # contenido real de ESTA escena. Todo lo que venga despues (si algo
    # viene) es el nombre de la siguiente locacion, que en la extraccion
    # de texto plano queda pegado ahi por como esta maquetado el PDF.
    cola = None
    m_pag = PAGCOUNT_MID_RE.search(contenido)
    if m_pag:
        posible_cola = contenido[m_pag.end():].strip(" .")
        contenido = contenido[:m_pag.start()].rstrip(" ,")
        if posible_cola:
            cola = posible_cola

    requerimientos = []
    matches = list(DEPT_LABEL_GLOBAL.finditer(contenido))
    for idx, m in enumerate(matches):
        etiqueta_dept = _normalizar_departamento(m.group(1))
        inicio = m.end()
        fin = matches[idx + 1].start() if idx + 1 < len(matches) else len(contenido)
        texto_items = contenido[inicio:fin].strip(" ,")
        items = [it.strip() for it in texto_items.split(",") if it.strip()]
        for item in items:
            requerimientos.append({"departamento": etiqueta_dept, "etiqueta": item, "cantidad": 1})

    escena = {
        "numero_de_escena": str(numero),
        "modo_vista": modo_vista,
        "encabezado": encabezado,
        "momento_dia": momento_dia,
        "dia_dramatico": dia,
        "fecha_de_grabacion": fecha,
        "ciudad": locacion,
        "requerimientos": requerimientos,
    }
    return escena, cola


def parse_desglose_pdf(texto: str):
    """Devuelve (escenas, dias): 'escenas' es la lista de escenas con sus
    requerimientos por departamento (usado por Desglose); 'dias' es la
    lista de dias del cronograma con su semana, fecha, locacion general
    y hora de llamado (usado por Plan de Rodaje). Ambos modulos comparten
    el mismo parser porque el PDF de origen tiene identica estructura
    Semana > Dia > Locacion > Escena."""
    texto = _limpiar_texto(texto)
    lineas = [l.strip() for l in texto.splitlines()]
    escenas = []
    dias = []

    dia_actual = None
    fecha_actual = None
    locacion_general = None
    locacion_especifica = None
    semana_actual = None

    scene_buffer = None
    scene_num_actual = None

    def flush():
        nonlocal scene_buffer, scene_num_actual, locacion_especifica
        if scene_buffer is not None and scene_num_actual is not None:
            bloque = " ".join(scene_buffer)
            escena, cola = _parse_bloque_escena(
                scene_num_actual, bloque, dia_actual, fecha_actual,
                locacion_especifica or locacion_general
            )
            if escena:
                escenas.append(escena)
            if cola:
                locacion_especifica = cola
        scene_buffer = None
        scene_num_actual = None

    for line in lineas:
        if not line:
            continue

        m_semana = SEMANA_RE.match(line)
        if m_semana:
            flush()
            semana_actual = int(m_semana.group(1))
            locacion_especifica = None
            continue

        m_dia = DIA_HEADER_RE.match(line)
        if m_dia:
            flush()
            dia_actual = int(m_dia.group(1))
            dia_num, mes_nombre, anio = m_dia.group(2), m_dia.group(3), m_dia.group(4)
            mes_num = MESES_ES.get(mes_nombre.strip().lower())
            try:
                fecha_actual = date(int(anio), mes_num, int(dia_num)) if mes_num else None
            except ValueError:
                fecha_actual = None
            locacion_general = m_dia.group(5).strip()
            llamado = m_dia.group(6).strip() if m_dia.group(6) else None
            locacion_especifica = None

            dias.append({
                "dia_dramatico": dia_actual,
                "semana": semana_actual,
                "fecha": fecha_actual,
                "locacion_general": locacion_general,
                "llamado": llamado,
            })
            continue

        if FIN_DIA_RE.match(line):
            flush()
            continue

        m_scene = SCENE_START_RE.match(line)
        if m_scene:
            flush()
            scene_num_actual = m_scene.group(1)
            scene_buffer = []
            modo = m_scene.group(2)
            resto = m_scene.group(3) or ""
            if modo:
                scene_buffer.append(f"{modo} {resto}".strip())
            continue

        if scene_buffer is not None:
            scene_buffer.append(line)
        elif not PAGCOUNT_RE.match(line):
            locacion_especifica = f"{locacion_especifica} {line}".strip() if locacion_especifica else line

    flush()
    return escenas, dias


def extraer_texto_pdf(ruta_archivo: str) -> str:
    from pypdf import PdfReader

    lector = PdfReader(ruta_archivo)
    paginas = [pagina.extract_text() or "" for pagina in lector.pages]
    return "\n".join(paginas)


# ==========================================
# PARSER DE PDF "PLAN DE RODAJE"
# ==========================================
# Formato distinto al de Desglose: cada escena empieza con "Sc. N", trae
# el conteo de paginas pegado al encabezado (no al final del bloque), y
# le sigue una linea de sinopsis en prosa antes de los bloques de
# departamento en MAYUSCULAS (sin ":"). Para Plan de Rodaje no
# necesitamos el detalle de requerimientos por departamento (eso lo
# cubre el modulo de Desglose) - solo necesitamos saber que escena va en
# que dia, y aprovechamos para rescatar la sinopsis como descripcion.

DEPTS_MAYUS = {
    "ELENCO", "PROPS", "SFX", "ARTE", "VESTUARIO", "CÁMARA", "CAMARA", "SONIDO",
    "STUNTS", "VFX", "NOTAS", "EXTRAS", "BITS", "CREW", "VEHÍCULOS", "VEHICULOS",
    "ANIMALES", "ARMAS", "MAQUILLAJE",
}

SCENE_ROD_RE = re.compile(r"^Sc\.\s*(\d{1,4})\s+(INT/EXT|EXT/INT|INT|EXT)\s+(.*)$", re.IGNORECASE)
PAGCOUNT_SUFFIX_RE = re.compile(r"\s*[\d\s/]*\d\s*p[áa]gs?\.?\s*$", re.IGNORECASE)


def _es_linea_departamento(line: str) -> bool:
    primera_palabra = line.strip().split(" ")[0].strip("/:").upper()
    return primera_palabra in DEPTS_MAYUS


def _parse_header_escena_rodaje(resto: str):
    m_momento = MOMENTO_RE.search(resto)
    if not m_momento:
        return None
    encabezado = resto[:m_momento.start()].strip(" -")
    momento_dia = m_momento.group(1).capitalize()
    return encabezado, momento_dia


def parse_rodaje_pdf(texto: str):
    """Devuelve (dias, escenas): 'dias' trae semana/fecha/locacion/llamado
    por cada 'DÍA N' del cronograma; 'escenas' trae, por cada 'Sc. N',
    su encabezado, modo de vista, momento del dia, dia dramatico,
    locacion y la sinopsis (si el PDF la trae) para usarla como
    descripcion de la escena."""
    texto = _limpiar_texto(texto)
    lineas = [l.strip() for l in texto.splitlines()]

    dias = []
    escenas = []

    dia_actual = None
    fecha_actual = None
    locacion_general = None
    locacion_especifica = None
    semana_actual = None

    escena_actual = None
    sinopsis_capturada = False

    def flush_escena():
        nonlocal escena_actual, sinopsis_capturada
        if escena_actual is not None:
            escenas.append(escena_actual)
        escena_actual = None
        sinopsis_capturada = False

    for line in lineas:
        if not line:
            continue

        m_semana = SEMANA_RE.match(line)
        if m_semana:
            flush_escena()
            semana_actual = int(m_semana.group(1))
            locacion_especifica = None
            continue

        m_dia = DIA_HEADER_RE.match(line)
        if m_dia:
            flush_escena()
            dia_actual = int(m_dia.group(1))
            dia_num, mes_nombre, anio = m_dia.group(2), m_dia.group(3), m_dia.group(4)
            mes_num = MESES_ES.get(mes_nombre.strip().lower())
            try:
                fecha_actual = date(int(anio), mes_num, int(dia_num)) if mes_num else None
            except ValueError:
                fecha_actual = None
            locacion_general = m_dia.group(5).strip()
            llamado = m_dia.group(6).strip() if m_dia.group(6) else None
            locacion_especifica = None

            dias.append({
                "dia_dramatico": dia_actual,
                "semana": semana_actual,
                "fecha": fecha_actual,
                "locacion_general": locacion_general,
                "llamado": llamado,
            })
            continue

        if FIN_DIA_RE.match(line):
            flush_escena()
            continue

        m_scene = SCENE_ROD_RE.match(line)
        if m_scene:
            flush_escena()
            numero = m_scene.group(1)
            modo = m_scene.group(2).upper()
            resto = PAGCOUNT_SUFFIX_RE.sub("", m_scene.group(3)).strip()
            resultado = _parse_header_escena_rodaje(resto)
            if resultado:
                encabezado, momento_dia = resultado
                escena_actual = {
                    "numero_de_escena": numero,
                    "modo_vista": modo,
                    "encabezado": encabezado,
                    "momento_dia": momento_dia,
                    "dia_dramatico": dia_actual,
                    "fecha_de_grabacion": fecha_actual,
                    "ciudad": locacion_especifica or locacion_general,
                    "descripcion": None,
                }
            continue

        if escena_actual is not None:
            if not sinopsis_capturada and not _es_linea_departamento(line):
                escena_actual["descripcion"] = line
            sinopsis_capturada = True
        elif not PAGCOUNT_RE.match(line):
            locacion_especifica = f"{locacion_especifica} {line}".strip() if locacion_especifica else line

    flush_escena()
    return dias, escenas
