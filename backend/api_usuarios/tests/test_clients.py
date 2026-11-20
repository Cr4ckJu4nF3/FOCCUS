"""Pruebas del CRUD de clientes con SQLite en memoria."""
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()):
    from app.config.database import Base
    from app.controllers.client_controller import (
        create_client,
        delete_client,
        update_client,
        update_client_full,
    )
    from app.models.client_model import Client
    from app.models.project_model import Project
    from app.schemas.client_schema import ClientSchema, ClientUpdateSchema


class ClientControllerTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine, tables=[Client.__table__, Project.__table__])
        self.db = sessionmaker(bind=self.engine)()
        self.client = Client(
            document="NIT",
            id_document="900123",
            razon_social="Empresa Uno",
            representante_legal="Ana",
            email="uno@example.test",
            telephone="123",
        )
        self.db.add(self.client)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_crear_normaliza_correo_y_rechaza_duplicado_sin_distinguir_mayusculas(self):
        another_client = Client(
            document="NIT",
            id_document="900456",
            razon_social="Empresa Dos",
            representante_legal="Luis",
            email="dos@example.test",
            telephone="456",
        )
        self.db.add(another_client)
        self.db.commit()
        duplicate = ClientUpdateSchema(email=" UNO@EXAMPLE.TEST ")
        self.assertEqual(update_client(another_client.id_cliente, duplicate, self.db)["error"], "DUPLICATE_EMAIL")

        payload = ClientUpdateSchema(
            document="NIT",
            id_document="900789",
            razon_social="Empresa Tres",
            representante_legal="Luis",
            email=" TRES@EXAMPLE.TEST ",
            telephone="789",
        )
        result = create_client(payload, self.db)
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["email"], "tres@example.test")

    def test_no_elimina_cliente_con_proyectos_asociados(self):
        self.db.add(Project(
            id_project="proj0001",
            project_name="Producción",
            formato_de_produccion="pelicula",
            genero="drama",
            id_client=self.client.id_cliente,
        ))
        self.db.commit()

        result = delete_client(self.client.id_cliente, self.db)

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "CLIENT_HAS_PROJECTS")
        self.assertIsNotNone(self.db.get(Client, self.client.id_cliente))

    def test_integrity_error_no_relacionado_con_email_se_propaga(self):
        create_payload = ClientSchema(
            document="NIT",
            id_document="900456",
            razon_social="Empresa Dos",
            representante_legal="Luis",
            email="dos@example.test",
            telephone=None,
        )
        full_update_payload = ClientSchema(
            document="NIT",
            id_document="900123",
            razon_social="Empresa Uno",
            representante_legal="Ana",
            email="uno@example.test",
            telephone=None,
        )
        partial_update_payload = ClientUpdateSchema(telephone=None)

        calls = (
            lambda: create_client(create_payload, self.db),
            lambda: update_client_full(self.client.id_cliente, full_update_payload, self.db),
            lambda: update_client(self.client.id_cliente, partial_update_payload, self.db),
        )
        for operation in calls:
            with self.subTest(operation=operation):
                with self.assertRaises(IntegrityError):
                    operation()
                self.assertIsNotNone(self.db.get(Client, self.client.id_cliente))


if __name__ == "__main__":
    unittest.main()
