import html
import os
import zipfile
import xml.etree.ElementTree as ET

from pypdf import PdfReader
from pypdf.errors import FileNotDecryptedError, PdfReadError

from app.utils.file_storage import BASE_UPLOAD_DIR


def _texto_a_html(texto: str) -> str | None:
    lineas = [linea.strip() for linea in texto.splitlines() if linea.strip()]
    if not lineas:
        return None
    return "".join(f"<p>{html.escape(linea)}</p>" for linea in lineas)


def _extraer_docx(ruta: str) -> str | None:
    with zipfile.ZipFile(ruta) as documento:
        contenido = ET.fromstring(documento.read("word/document.xml"))

    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    lineas = []
    for parrafo in contenido.iter(f"{namespace}p"):
        texto = "".join(
            (nodo.text or "") if nodo.tag == f"{namespace}t"
            else "\t" if nodo.tag == f"{namespace}tab"
            else "\n" if nodo.tag == f"{namespace}br"
            else ""
            for nodo in parrafo.iter()
        ).strip()
        if texto:
            lineas.append(texto)
    return _texto_a_html("\n".join(lineas))


def _extraer_fdx(ruta: str) -> str | None:
    raiz = ET.parse(ruta).getroot()
    parrafos = [
        "".join(parrafo.itertext()).strip()
        for parrafo in raiz.iter()
        if parrafo.tag.rsplit("}", 1)[-1] == "Paragraph"
    ]
    return _texto_a_html("\n".join(texto for texto in parrafos if texto))


def extraer_contenido_guion(ruta_archivo: str) -> tuple[str | None, str | None]:
    nombre = os.path.basename(ruta_archivo)
    ruta = os.path.join(BASE_UPLOAD_DIR, ruta_archivo.removeprefix("uploads/"))
    extension = os.path.splitext(nombre)[1].lower()

    try:
        if extension == ".pdf":
            texto = "\n".join(
                pagina.extract_text() or ""
                for pagina in PdfReader(ruta, strict=False).pages
            )
        elif extension == ".docx":
            texto = _extraer_docx(ruta)
            return (texto, None) if texto else (None, "No se encontró texto editable en el documento.")
        elif extension == ".fdx":
            texto = _extraer_fdx(ruta)
            return (texto, None) if texto else (None, "No se encontró texto editable en el documento.")
        else:
            return None, "Este formato no permite extraer texto para editarlo."
    except (FileNotDecryptedError, PdfReadError, zipfile.BadZipFile, ET.ParseError, OSError, KeyError, RuntimeError):
        return None, "No se pudo extraer el texto; el archivo original sigue disponible para consulta."

    contenido = _texto_a_html(texto)
    if not contenido:
        return None, "No se encontró texto editable. Si es un PDF escaneado, se requiere OCR."
    return contenido, None
