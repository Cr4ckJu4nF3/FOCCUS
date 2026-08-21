import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from dotenv import load_dotenv

load_dotenv()

MAIL_USER = os.getenv("MAIL_USER")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL")

def send_recovery_email(destinatario: str, codigo: str):
    try:
        mensaje = MIMEMultipart("related")
        mensaje["From"] = MAIL_USER
        mensaje["To"] = destinatario
        mensaje["Subject"] = "Recuperación de contraseña - Raccord"

        cuerpo = f"""
        <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2>Recuperación de Contraseña</h2>
            <p>Has solicitado recuperar tu contraseña.</p>
            <p>Tu código de recuperación es:</p>
            <h1 style="color: #2563eb; letter-spacing: 5px;">{codigo}</h1>
            <p>Este código expira en 15 minutos.</p>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
            <br>
            <p>Equipo Raccord. </p>
            <br>
            <img src="cid:logo" alt="Raccord Logo" style="width: 150px; height: auto;">
        </body>
        </html>
        """

        msg_html = MIMEText(cuerpo, "html")
        mensaje.attach(msg_html)

        # Ruta del logo
        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.png")

        with open(logo_path, "rb") as img:
            logo = MIMEImage(img.read())
            logo.add_header("Content-ID", "<logo>")
            logo.add_header("Content-Disposition", "inline", filename="logo.png")
            mensaje.attach(logo)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(MAIL_USER, MAIL_PASSWORD)
        server.sendmail(MAIL_USER, destinatario, mensaje.as_string())
        server.quit()

        return True
    except Exception as e:
        print("Error enviando correo:", e)
        return False
    
# correo para recibir el mail de codigo de verificación de para ingresar a raccord.
def send_2fa_email(destinatario: str, codigo: str):
    try:
        mensaje = MIMEMultipart("related")
        mensaje["From"] = MAIL_USER
        mensaje["To"] = destinatario
        mensaje["Subject"] = "Código de verificación - Raccord"

        cuerpo = f"""
        <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2>Verificación de Identidad</h2>
            <p>Se ha detectado un inicio de sesión en tu cuenta.</p>
            <p>Tu código de verificación es:</p>
            <h1 style="color: #2563eb; letter-spacing: 5px;">{codigo}</h1>
            <p>Este código expira en 10 minutos.</p>
            <p>Si no fuiste tú, cambia tu contraseña inmediatamente.</p>
            <br>
            <p>Equipo Raccord</p>
            <br>
            <img src="cid:logo" alt="Raccord Logo" style="width: 150px; height: auto;">
        </body>
        </html>
        """

        msg_html = MIMEText(cuerpo, "html")
        mensaje.attach(msg_html)

        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.png")

        with open(logo_path, "rb") as img:
            logo = MIMEImage(img.read())
            logo.add_header("Content-ID", "<logo>")
            logo.add_header("Content-Disposition", "inline", filename="logo.png")
            mensaje.attach(logo)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(MAIL_USER, MAIL_PASSWORD)
        server.sendmail(MAIL_USER, destinatario, mensaje.as_string())
        server.quit()

        return True
    except Exception as e:
        print("Error enviando correo 2FA:", e)
        return False

# correo donde el admi invita a demas miembros a traves del correo a hacer participe del equipo.

def send_invitation_email(destinatario: str, nombre_proyecto: str, contrasena: str):
    try:
        mensaje = MIMEMultipart("related")
        mensaje["From"] = MAIL_USER
        mensaje["To"] = destinatario
        mensaje["Subject"] = f"Invitación al proyecto {nombre_proyecto} - Raccord"

        cuerpo = f"""
        <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2>¡Has sido invitado!</h2>
            <p>Se te ha invitado a colaborar en el proyecto <strong>{nombre_proyecto}</strong> en Raccord.</p>
            <br>
            <p>Tus credenciales de acceso son:</p>
            <table style="margin: 0 auto; text-align: left; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Usuario:</td>
                    <td style="padding: 8px;">{destinatario}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Contraseña:</td>
                    <td style="padding: 8px; color: #2563eb; font-size: 18px; letter-spacing: 2px;">{contrasena}</td>
                </tr>
            </table>
            <br>
            <p>Te recomendamos cambiar tu contraseña después de iniciar sesión.</p>
            <br>
            <p>Equipo Raccord</p>
            <br>
            <img src="cid:logo" alt="Raccord Logo" style="width: 150px; height: auto;">
        </body>
        </html>
        """

        msg_html = MIMEText(cuerpo, "html")
        mensaje.attach(msg_html)

        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.png")

        with open(logo_path, "rb") as img:
            logo = MIMEImage(img.read())
            logo.add_header("Content-ID", "<logo>")
            logo.add_header("Content-Disposition", "inline", filename="logo.png")
            mensaje.attach(logo)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(MAIL_USER, MAIL_PASSWORD)
        server.sendmail(MAIL_USER, destinatario, mensaje.as_string())
        server.quit()

        return True
    except Exception as e:
        print("Error enviando invitación:", e)
        return False

# mensaje del landing


def send_contact_email(nombre: str, email: str, celular: str, empresa: str, tipo: str, mensaje: str):
    try:
        msg = MIMEMultipart("related")
        msg["From"] = MAIL_USER
        msg["To"] = CONTACT_EMAIL
        msg["Subject"] = f"Nuevo contacto desde RACCORD - {tipo}"

        cuerpo = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">Nuevo Contacto desde RACCORD</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Nombre</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{nombre}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Email</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{celular}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Email</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{email}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Empresa</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{empresa if empresa else 'No especificada'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Tipo</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{tipo}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Mensaje</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{mensaje}</td>
                </tr>
            </table>
            <br>
            <p style="color: #888;">Este mensaje fue enviado desde el formulario de contacto de RACCORD.</p>
            <br>
            <img src="cid:logo" alt="Raccord Logo" style="width: 150px; height: auto;">
        </body>
        </html>
        """

        msg_html = MIMEText(cuerpo, "html")
        msg.attach(msg_html)

        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.png")

        with open(logo_path, "rb") as img:
            logo = MIMEImage(img.read())
            logo.add_header("Content-ID", "<logo>")
            logo.add_header("Content-Disposition", "inline", filename="logo.png")
            msg.attach(logo)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(MAIL_USER, MAIL_PASSWORD)
        server.sendmail(MAIL_USER, CONTACT_EMAIL, msg.as_string())
        server.quit()

        return True
    except Exception as e:
        print("Error enviando correo de contacto:", e)
        return False