import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from fastapi import UploadFile

from app.utils import file_storage, guion_content


def _crear_pdf_con_texto(texto: str) -> bytes:
    contenido = (
        "BT /F1 12 Tf 50 740 Td ("
        + texto.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        + ") Tj ET\n"
    ).encode("ascii")
    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
        b"<< /Length "
        + str(len(contenido)).encode("ascii")
        + b" >>\nstream\n"
        + contenido
        + b"endstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for numero, objeto in enumerate(objetos, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{numero} 0 obj\n".encode("ascii") + objeto + b"\nendobj\n")

    inicio_xref = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n{inicio_xref}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


def _crear_docx() -> bytes:
    documento_xml = """\
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>INT. ROOM - DAY</w:t></w:r></w:p>
    <w:p><w:r><w:t>ALICE</w:t></w:r></w:p>
  </w:body>
</w:document>
"""
    archivo = io.BytesIO()
    with zipfile.ZipFile(archivo, "w") as docx:
        docx.writestr("word/document.xml", documento_xml)
    return archivo.getvalue()


def _crear_fdx() -> bytes:
    return b"""\
<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" DocumentStage="Screenplay">
  <Content>
    <Paragraph Type="Scene Heading"><Text>INT. ROOM - DAY</Text></Paragraph>
    <Paragraph Type="Character"><Text>ALICE</Text></Paragraph>
  </Content>
</FinalDraft>
"""


class GuionContentAisladoTests(unittest.TestCase):
    def setUp(self):
        self.directorio_temporal = tempfile.TemporaryDirectory()
        self.addCleanup(self.directorio_temporal.cleanup)
        for modulo in (file_storage, guion_content):
            sustitucion = patch.object(
                modulo, "BASE_UPLOAD_DIR", self.directorio_temporal.name
            )
            sustitucion.start()
            self.addCleanup(sustitucion.stop)

    def _subir_y_extraer(self, nombre: str, contenido: bytes) -> str:
        self.assertIn(Path(nombre).suffix, file_storage.EXTENSIONES_GUION)
        archivo = UploadFile(filename=nombre, file=io.BytesIO(contenido))
        ruta = file_storage.guardar_archivo(
            archivo,
            subcarpeta="guiones/prueba-aislada",
            extensiones_permitidas=file_storage.EXTENSIONES_GUION,
        )
        self.assertTrue(ruta.startswith("uploads/guiones/prueba-aislada/"))
        self.assertTrue(ruta.endswith(Path(nombre).suffix))

        texto_html, error = guion_content.extraer_contenido_guion(ruta)
        self.assertIsNone(error)
        self.assertIsNotNone(texto_html)
        return texto_html

    def test_importa_pdf_con_texto_a_traves_del_contrato_de_archivo(self):
        texto_html = self._subir_y_extraer(
            "guion.pdf", _crear_pdf_con_texto("INT. ROOM - DAY")
        )

        self.assertIn("<p>INT. ROOM - DAY</p>", texto_html)

    def test_importa_docx_con_texto_a_traves_del_contrato_de_archivo(self):
        texto_html = self._subir_y_extraer("guion.docx", _crear_docx())

        self.assertIn("<p>INT. ROOM - DAY</p>", texto_html)
        self.assertIn("<p>ALICE</p>", texto_html)

    def test_importa_fdx_con_texto_a_traves_del_contrato_de_archivo(self):
        texto_html = self._subir_y_extraer("guion.fdx", _crear_fdx())

        self.assertIn("<p>INT. ROOM - DAY</p>", texto_html)
        self.assertIn("<p>ALICE</p>", texto_html)


if __name__ == "__main__":
    unittest.main()
