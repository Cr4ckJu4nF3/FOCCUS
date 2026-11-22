"""Casos T6 de JWT y validación; nunca carga .env ni conecta a MySQL."""
import os
import sys
import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()), \
        patch.dict(os.environ, {
            "JWT_SECRET_KEY": "clave-solo-pruebas-ficticia-123456789",
            "JWT_EXPIRE_MINUTES": "1440", "DB_HOST": "127.0.0.1",
            "DB_PORT": "3306", "DB_USER": "ficticio", "DB_PASSWORD": "ficticia",
            "DB_NAME": "ficticia", "MAIL_USER": "", "MAIL_PASSWORD": "", "CONTACT_EMAIL": "",
        }):
    from fastapi import HTTPException
    from pydantic import ValidationError
    from app.schemas.user_schema import CompleteInvitationSchema, LoginSchema, ResetPasswordSchema
    from app.utils.auth import create_access_token, get_current_user, require_admin


class SeguridadT6Tests(unittest.TestCase):
    def assert_unauthorized(self, authorization):
        with self.assertRaises(HTTPException) as error:
            get_current_user(authorization)
        self.assertEqual(error.exception.status_code, 401)

    def test_01_jwt_valido(self):
        token = create_access_token({"id_user": 1, "two_factor_verified": True})
        self.assertEqual(get_current_user("Bearer " + token)["id_user"], 1)

    def test_02_sin_cabecera(self):
        self.assert_unauthorized(None)

    def test_03_esquema_incorrecto(self):
        self.assert_unauthorized("Basic prueba")

    def test_04_jwt_malformado(self):
        self.assert_unauthorized("Bearer no-es-un-jwt")

    def test_05_jwt_expirado(self):
        token = create_access_token({"id_user": 1, "two_factor_verified": True}, expires_minutes=-1)
        self.assert_unauthorized("Bearer " + token)

    def test_06_jwt_sin_usuario(self):
        token = create_access_token({"two_factor_verified": True})
        self.assert_unauthorized("Bearer " + token)

    def test_07_jwt_sin_2fa(self):
        token = create_access_token({"id_user": 1})
        self.assert_unauthorized("Bearer " + token)

    def test_08_jwt_2fa_falso(self):
        token = create_access_token({"id_user": 1, "two_factor_verified": False})
        self.assert_unauthorized("Bearer " + token)

    def test_09_admin_rol_vigente(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value.id_rol = 1001
        self.assertEqual(require_admin({"id_user": 1, "id_rol": 1005}, db)["id_rol"], 1001)

    def test_10_admin_claim_obsoleto(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value.id_rol = 1005
        with self.assertRaises(HTTPException) as error:
            require_admin({"id_user": 1, "id_rol": 1001}, db)
        self.assertEqual(error.exception.status_code, 403)

    def test_11_admin_cuenta_inexistente(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with self.assertRaises(HTTPException) as error:
            require_admin({"id_user": 999}, db)
        self.assertEqual(error.exception.status_code, 401)

    def test_12_login_valido(self):
        self.assertEqual(LoginSchema(mail="a@example.test", contrasena="x", device_id="d").device_id, "d")

    def test_13_login_sin_device(self):
        with self.assertRaises(ValidationError):
            LoginSchema(mail="a@example.test", contrasena="x")

    def test_14_login_device_vacio(self):
        with self.assertRaises(ValidationError):
            LoginSchema(mail="a@example.test", contrasena="x", device_id="")

    def test_15_login_device_largo(self):
        with self.assertRaises(ValidationError):
            LoginSchema(mail="a@example.test", contrasena="x", device_id="d" * 256)

    def test_16_reset_72_bytes(self):
        ResetPasswordSchema(mail="a@example.test", codigo="123456", nueva_contrasena="a" * 72)

    def test_17_reset_73_bytes(self):
        with self.assertRaises(ValidationError):
            ResetPasswordSchema(mail="a@example.test", codigo="123456", nueva_contrasena="a" * 73)

    def test_18_reset_unicode_supera_72_bytes(self):
        with self.assertRaises(ValidationError):
            ResetPasswordSchema(mail="a@example.test", codigo="123456", nueva_contrasena="ñ" * 37)

    def invitation(self, **changes):
        data = {
            "nombre": " Persona ", "apellido": " Prueba ", "identificacion": "CC",
            "id_identificacion": "123", "msisdn": "3000000000", "direccion": "Prueba",
            "fecha_de_nacimiento": "2000-01-01", "contrasena": "Prueba123!",
        }
        data.update(changes)
        return CompleteInvitationSchema(**data)

    def test_19_invitacion_valida_y_normalizada(self):
        self.assertEqual(self.invitation().nombre, "Persona")

    def test_20_invitacion_nombre_vacio(self):
        with self.assertRaises(ValidationError):
            self.invitation(nombre="   ")

    def test_21_invitacion_fecha_hoy(self):
        with self.assertRaises(ValidationError):
            self.invitation(fecha_de_nacimiento=date.today())

    def test_22_invitacion_fecha_futura(self):
        with self.assertRaises(ValidationError):
            self.invitation(fecha_de_nacimiento=date.today() + timedelta(days=1))

    def test_23_invitacion_contrasena_corta(self):
        with self.assertRaises(ValidationError):
            self.invitation(contrasena="Ab1!")

    def test_24_invitacion_sin_mayuscula(self):
        with self.assertRaises(ValidationError):
            self.invitation(contrasena="prueba123!")

    def test_25_invitacion_sin_minuscula(self):
        with self.assertRaises(ValidationError):
            self.invitation(contrasena="PRUEBA123!")

    def test_26_invitacion_sin_numero(self):
        with self.assertRaises(ValidationError):
            self.invitation(contrasena="PruebaABC!")

    def test_27_invitacion_sin_especial(self):
        with self.assertRaises(ValidationError):
            self.invitation(contrasena="Prueba123")


if __name__ == "__main__":
    unittest.main()
