"""Importación RF-24/RF-25 probada con PDFs y SQLite temporales."""
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()):
    from fastapi import UploadFile
    from app.config.database import Base
    from app.controllers import desglose_controller, rodaje_controller
    from app.models.Guion import Guion
    from app.models.desglose_model import Desglose
    from app.models.desglose_requerimiento_model import DesgloseRequerimiento
    from app.models.escena_model import Escena
    from app.models.guion_version_model import GuionVersion
    from app.models.project_model import Project
    from app.models.rodaje_model import Rodaje
    from app.models.user_model import User
    from app.routes import desglose_routes, rodaje_routes

from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


def _crear_pdf(lineas_por_pagina):
    """Crea un PDF pequeño con texto WinAnsi seleccionable, sin librerías extra."""
    paginas = []
    for lineas in lineas_por_pagina:
        trozos = []
        for linea in lineas:
            escapada = linea.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            trozos.append(f"({escapada}) Tj 0 -12 Td".encode("cp1252"))
        paginas.append(b"BT /F1 9 Tf 50 750 Td " + b" ".join(trozos) + b" ET\n")

    numero_fuente = 3 + len(paginas) * 2
    hijos = " ".join(f"{3 + pagina * 2} 0 R" for pagina in range(len(paginas)))
    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{hijos}] /Count {len(paginas)} >>".encode("ascii"),
    ]
    for indice, contenido in enumerate(paginas):
        numero_pagina = 3 + indice * 2
        numero_contenido = numero_pagina + 1
        objetos.extend([
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Resources << /Font << /F1 {numero_fuente} 0 R >> >> "
                f"/Contents {numero_contenido} 0 R >>"
            ).encode("ascii"),
            b"<< /Length " + str(len(contenido)).encode("ascii") + b" >>\nstream\n"
            + contenido + b"endstream",
        ])
    objetos.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")

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


def _cabecera_dia(fecha="2 de marzo 2026", dia=1):
    return f"DÍA {dia} · Lunes, {fecha} · Estudio · Llamado: 6:00 AM ·"


class ImportacionesRF24RF25AisladasTests(unittest.TestCase):
    def setUp(self):
        self.directorio = tempfile.TemporaryDirectory()
        self.addCleanup(self.directorio.cleanup)
        self.temporal = Path(self.directorio.name)
        self.directorio_temporal_pdf = patch("tempfile.tempdir", self.directorio.name)
        self.directorio_temporal_pdf.start()
        self.addCleanup(self.directorio_temporal_pdf.stop)

        self.engine = create_engine(f"sqlite:///{self.temporal / 'rf24-rf25.sqlite'}")
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine, tables=[
            Project.__table__,
            Guion.__table__,
            Escena.__table__,
            Desglose.__table__,
            DesgloseRequerimiento.__table__,
            Rodaje.__table__,
        ])
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.addCleanup(self.db.close)
        self.db.add(Project(
            id_project="prueba", project_name="Proyecto de prueba",
            formato_de_produccion="film", genero="drama", id_client=1,
        ))
        self.db.add(Guion(
            id_guion=1, nombre="Guion sintético", descripcion="",
            id_project="prueba",
        ))
        self.db.commit()
        self.codigos_desglose = patch.object(desglose_controller, "asignar_codigo", return_value=None)
        self.codigos_rodaje = patch.object(rodaje_controller, "asignar_codigo", return_value=None)
        self.codigos_desglose.start()
        self.codigos_rodaje.start()
        self.addCleanup(self.codigos_desglose.stop)
        self.addCleanup(self.codigos_rodaje.stop)

    def _archivo(self, nombre, contenido):
        return UploadFile(filename=nombre, file=io.BytesIO(contenido))

    def _importar_desglose(self, archivo):
        return desglose_routes.importar_desglose(
            1, archivo, self.db, {"id_project": "prueba"}
        )

    def _importar_rodaje(self, archivo):
        return rodaje_routes.importar_rodaje(
            "prueba", archivo, self.db, {"id_project": "prueba"}
        )

    def test_importa_desglose_multipagina_y_reimportar_reemplaza_requerimientos(self):
        pdf = _crear_pdf([
            [
                "SEMANA 1",
                _cabecera_dia(),
                "Sala principal",
                "1 INT. SALA - DIA",
                "Entrada de la protagonista",
                "Props: Carta, Taza",
                "Vestuario: Abrigo",
                "2/8 Patio exterior",
            ],
            [
                "SC. INT/EXT. ESCENAS PAGS.",
                "2 EXT. PATIO - NOCHE",
                "Sale al patio",
                "Elenco: Ana, Luis",
                "Fin Día 1",
            ],
        ])

        primera = self._importar_desglose(self._archivo("desglose.pdf", pdf))
        self.assertTrue(primera["success"], primera)
        self.assertEqual(primera["data"]["escenas_creadas"], 2)
        self.assertEqual(primera["data"]["requerimientos_creados"], 5)

        escenas = self.db.query(Escena).order_by(Escena.numero_de_escena).all()
        self.assertEqual([escena.encabezado for escena in escenas], ["SALA", "PATIO"])
        self.assertEqual(escenas[0].ciudad, "Sala principal")
        self.assertEqual(escenas[1].ciudad, "Patio exterior")
        self.assertEqual(escenas[0].fecha_de_grabacion.isoformat(), "2026-03-02")
        self.assertEqual(self.db.query(DesgloseRequerimiento).count(), 5)

        segunda = self._importar_desglose(self._archivo("desglose.pdf", pdf))
        self.assertTrue(segunda["success"], segunda)
        self.assertEqual(segunda["data"]["escenas_creadas"], 0)
        self.assertEqual(segunda["data"]["escenas_actualizadas"], 2)
        self.assertEqual(self.db.query(DesgloseRequerimiento).count(), 5)
        self.assertEqual(list(self.temporal.glob("tmp*.pdf")), [])

    def test_importa_cronograma_y_asigna_escena_existente(self):
        self.db.add(Escena(
            id_escena="esc0001", numero_de_escena="1", encabezado="SALA",
            id_guion=1,
        ))
        self.db.commit()
        pdf = _crear_pdf([[
            "SEMANA 1",
            _cabecera_dia(),
            "Sala principal",
            "Sc. 1 INT. SALA - DIA 2/8",
            "La protagonista entra al recinto.",
            "ELENCO",
            "Fin Día 1",
        ]])

        respuesta = self._importar_rodaje(self._archivo("plan.pdf", pdf))
        self.assertTrue(respuesta["success"], respuesta)
        self.assertEqual(respuesta["data"]["dias_creados"], 1)
        self.assertEqual(respuesta["data"]["escenas_asignadas"], 1)
        escena = self.db.query(Escena).filter_by(id_escena="esc0001").one()
        self.assertEqual(escena.id_rodaje, "rod0001")
        self.assertEqual(escena.encabezado, "SALA")
        self.assertEqual(escena.descripcion, "La protagonista entra al recinto.")

    def test_rechaza_mes_no_reconocido_sin_crear_jornada(self):
        self.db.add(Escena(
            id_escena="esc0001", numero_de_escena="1", encabezado="SALA",
            id_guion=1,
        ))
        self.db.commit()
        pdf = _crear_pdf([
            [
                "SEMANA 1",
                _cabecera_dia(),
                "Sc. 1 INT. SALA - DIA 2/8",
                "Primera sinopsis",
                "Fin Día 1",
            ],
            [
                _cabecera_dia("2 de Smarch 2026", dia=2),
                "Sc. 1 INT. SALA - DIA 2/8",
                "Segunda sinopsis",
                "Fin Día 2",
            ],
        ])

        respuesta = self._importar_rodaje(self._archivo("plan.pdf", pdf))
        self.assertFalse(respuesta["success"])
        self.assertEqual(respuesta["error"], "INVALID_SCHEDULE_DATE")
        self.assertEqual(self.db.query(Rodaje).count(), 0)
        self.assertIsNone(self.db.query(Escena).filter_by(id_escena="esc0001").one().id_rodaje)

    def test_rechaza_docx_en_ambos_importadores_con_mensaje_explicito(self):
        for importar in (self._importar_desglose, self._importar_rodaje):
            respuesta = importar(self._archivo("archivo.docx", b"PK\x03\x04contenido"))
            self.assertFalse(respuesta["success"])
            self.assertEqual(respuesta["error"], "UNSUPPORTED_FILE_FORMAT")
            self.assertIn("PDF", respuesta["message"])
        self.assertEqual(self.db.query(Escena).count(), 0)
        self.assertEqual(self.db.query(Rodaje).count(), 0)

    def test_reporta_pdf_danado_y_pdf_sin_escenas_de_forma_clara(self):
        danado = self._importar_desglose(
            self._archivo("danado.pdf", b"%PDF-1.4\ncontenido incompleto")
        )
        self.assertFalse(danado["success"])
        self.assertEqual(danado["error"], "PDF_READ_ERROR")
        self.assertIn("PDF válido", danado["message"])

        sin_texto = _crear_pdf([[]])
        vacio = self._importar_desglose(self._archivo("escaneado.pdf", sin_texto))
        self.assertFalse(vacio["success"])
        self.assertEqual(vacio["error"], "NO_SCENES_FOUND")
        self.assertIn("formato de desglose esperado", vacio["message"])

        cronograma_vacio = self._importar_rodaje(self._archivo("escaneado.pdf", sin_texto))
        self.assertFalse(cronograma_vacio["success"])
        self.assertEqual(cronograma_vacio["error"], "NO_DAYS_FOUND")


if __name__ == "__main__":
    unittest.main()
