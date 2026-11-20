"""Pruebas SMTP sin acceso a red, configuración local ni base de datos."""

import importlib.util
import logging
import smtplib
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch


MAIL_PATH = Path(__file__).resolve().parents[1] / "app" / "utils" / "mail.py"
dotenv_fake = types.ModuleType("dotenv")
dotenv_fake.load_dotenv = lambda: None
spec = importlib.util.spec_from_file_location("mail_aislado", MAIL_PATH)
mail = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"dotenv": dotenv_fake}), patch(
    "os.getenv", side_effect=lambda name: "cuenta-ficticia"
):
    spec.loader.exec_module(mail)


class MailAisladoTest(unittest.TestCase):
    def setUp(self):
        self.servidor = MagicMock()
        self.servidor.sendmail.return_value = {}
        self.smtp = patch.object(mail.smtplib, "SMTP", return_value=self.servidor)
        self.smtp_mock = self.smtp.start()
        self.addCleanup(self.smtp.stop)
        logo = patch("builtins.open", mock_open(read_data=b"\x89PNG\r\n\x1a\nlogo"))
        logo.start()
        self.addCleanup(logo.stop)

    def envios(self):
        return [
            lambda: mail.send_recovery_email("destino-ficticio", "codigo-ficticio"),
            lambda: mail.send_2fa_email("destino-ficticio", "codigo-ficticio"),
            lambda: mail.send_invitation_email("destino-ficticio", "proyecto", "clave-ficticia"),
            lambda: mail.send_contact_email(
                "nombre", "destino-ficticio", "celular", "empresa", "tipo", "contenido-ficticio"
            ),
        ]

    def test_entrega_normal_en_los_cuatro_correos(self):
        for enviar in self.envios():
            with self.subTest(envio=enviar):
                self.assertTrue(enviar())
        self.assertEqual(self.servidor.sendmail.call_count, 4)
        self.assertEqual(self.servidor.quit.call_count, 4)
        self.servidor.close.assert_not_called()
        self.assertEqual(
            [call[0] for call in self.servidor.mock_calls[:4]],
            ["starttls", "login", "sendmail", "quit"],
        )

    def test_entrega_aceptada_incluso_si_falla_quit(self):
        self.servidor.quit.side_effect = smtplib.SMTPServerDisconnected("detalle privado")
        for enviar in self.envios():
            with self.subTest(envio=enviar), self.assertLogs(level=logging.WARNING) as logs:
                self.assertTrue(enviar())
            self.assertIn("cierre", " ".join(logs.output).lower())
        self.assertEqual(self.servidor.sendmail.call_count, 4)
        self.assertEqual(self.servidor.close.call_count, 4)
        self.smtp_mock.assert_called_with("smtp.gmail.com", 587, timeout=unittest.mock.ANY)
        self.assertGreater(self.smtp_mock.call_args.kwargs["timeout"], 0)

    def test_error_de_envio_no_se_marca_como_enviado(self):
        self.servidor.sendmail.side_effect = smtplib.SMTPException("detalle privado")
        self.servidor.quit.side_effect = smtplib.SMTPServerDisconnected("detalle privado")
        for enviar in self.envios():
            with self.subTest(envio=enviar), self.assertLogs(level=logging.WARNING) as logs:
                self.assertFalse(enviar())
            self.assertIn("envío", " ".join(logs.output).lower())
        self.assertEqual(self.servidor.close.call_count, 4)

    def test_error_conexion_tls_y_autenticacion(self):
        for fase in ("conexion", "tls", "autenticacion"):
            with self.subTest(fase=fase):
                self.servidor.reset_mock(side_effect=True, return_value=True)
                self.smtp_mock.reset_mock(side_effect=True)
                self.smtp_mock.return_value = self.servidor
                self.servidor.sendmail.return_value = {}
                if fase == "conexion":
                    self.smtp_mock.side_effect = TimeoutError("detalle privado")
                elif fase == "tls":
                    self.servidor.starttls.side_effect = smtplib.SMTPException("detalle privado")
                else:
                    self.servidor.login.side_effect = smtplib.SMTPAuthenticationError(
                        535, b"detalle privado"
                    )
                with self.assertLogs(level=logging.WARNING) as logs:
                    self.assertFalse(self.envios()[0]())
                self.assertIn(fase, " ".join(logs.output).lower())
                self.servidor.sendmail.assert_not_called()
                if fase != "conexion":
                    self.servidor.quit.assert_called_once()

    def test_destinatario_rechazado_no_es_entrega_aceptada(self):
        self.servidor.sendmail.return_value = {"destino-ficticio": (550, b"rechazado")}
        with self.assertLogs(level=logging.WARNING):
            self.assertFalse(self.envios()[0]())

    def test_diagnosticos_no_incluyen_datos_ni_mensajes_de_excepcion(self):
        secreto = "credencial codigo contenido destino 123456"
        self.servidor.sendmail.side_effect = smtplib.SMTPException(secreto)
        self.servidor.quit.side_effect = smtplib.SMTPException(secreto)
        self.servidor.close.side_effect = OSError(secreto)
        with self.assertLogs(level=logging.WARNING) as logs, patch("builtins.print") as salida:
            self.assertFalse(self.envios()[0]())
        texto = " ".join(logs.output)
        for dato in (secreto, "destino-ficticio", "codigo-ficticio", "cuenta-ficticia"):
            self.assertNotIn(dato, texto)
        salida.assert_not_called()

    def test_error_preparando_mensaje_no_conecta(self):
        with patch("builtins.open", side_effect=OSError("detalle privado")):
            with self.assertLogs(level=logging.WARNING) as logs:
                self.assertFalse(self.envios()[0]())
        self.assertIn("preparación", " ".join(logs.output).lower())
        self.smtp_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
