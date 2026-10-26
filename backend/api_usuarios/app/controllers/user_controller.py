import random
import string
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from app.utils.mail import send_recovery_email, send_2fa_email, send_invitation_email
from app.utils.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REMEMBER_TOKEN_EXPIRE_MINUTES,
    create_access_token,
)
from app.models.project_model import Project
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from passlib.context import CryptContext
from app.models.user_model import User
from app.schemas.user_schema import UserSchema
from app.utils.response import api_response
from app.models.client_model import Client
from app.models.user_project_model import UserProject

# ==========================================
# HASH CONFIG
# ==========================================
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# ==========================================
# FORMATEAR TEXTO (Primera letra mayúscula)
# ==========================================
def format_text(text):
    if text and isinstance(text, str):
        return text.strip().title()
    return text

# ==========================================
# CODIGOS DE RECUPERACION
# ==========================================
recovery_codes = {}

# ==========================================
# 2FA - DISPOSITIVOS VERIFICADOS
# ==========================================
verified_devices = {}
two_factor_codes = {}

# ==========================================
# GET ALL USERS
# ==========================================
def get_users(db: Session):
    users = db.query(User).all()
    users_list = [
        {
            "id_user": u.id_user,
            "nombre": u.nombre,
            "apellido": u.apellido,
            "identificacion": u.identificacion,
            "id_identificacion": u.id_identificacion,
            "mail": u.mail,
            "msisdn": u.msisdn,
            "direccion": u.direccion,
            "fecha_de_nacimiento": str(u.fecha_de_nacimiento),
            "estado": u.estado,
            "fecha_de_creacion": str(u.fecha_de_creacion),
            "ultimo_acceso": str(u.ultimo_acceso),
            "id_departamento": u.id_departamento,
            "id_client": u.id_client,
            "id_project": u.id_project,
            "id_rol": u.id_rol
        }
        for u in users
    ]
    return api_response(True, "Lista de usuarios", users_list)

# ==========================================
# GET USER BY ID
# ==========================================
def get_user(id: int, db: Session):
    user = db.query(User).filter(User.id_user == id).first()

    if not user:
        return api_response(False, "Usuario no encontrado")

    return api_response(True, "Usuario encontrado", {
        "id_user": user.id_user,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "identificacion": user.identificacion,
        "id_identificacion": user.id_identificacion,
        "mail": user.mail,
        "msisdn": user.msisdn,
        "direccion": user.direccion,
        "fecha_de_nacimiento": str(user.fecha_de_nacimiento),
        "estado": user.estado,
        "fecha_de_creacion": str(user.fecha_de_creacion),
        "ultimo_acceso": str(user.ultimo_acceso),
        "id_departamento": user.id_departamento,
        "id_client": user.id_client,
        "id_project": user.id_project,
        "id_rol": user.id_rol
    })

# ==========================================
# CREATE USER
# ==========================================
def create_user(user: UserSchema, db: Session):
    existing = db.query(User).filter(User.mail == user.mail).first()

    if existing:
        return api_response(False, "Correo ya registrado", error="DUPLICATE_EMAIL")

    existing_id = db.query(User).filter(User.id_identificacion == user.id_identificacion).first()

    if existing_id:
        return api_response(False, "Identificacion ya registrada", error="DUPLICATE_ID")

    hashed_password = pwd_context.hash(user.contrasena)

    new_user = User(
        nombre=format_text(user.nombre),
        apellido=format_text(user.apellido),
        identificacion=user.identificacion,
        id_identificacion=user.id_identificacion,
        mail=user.mail.strip().lower(),
        msisdn=user.msisdn,
        direccion=format_text(user.direccion),
        fecha_de_nacimiento=user.fecha_de_nacimiento,
        estado=user.estado,
        contrasena=hashed_password,
        id_departamento=user.id_departamento,
        id_project=user.id_project,
        id_rol=user.id_rol
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return api_response(True, "Usuario registrado correctamente", {
        "id_user": new_user.id_user,
        "nombre": new_user.nombre,
        "apellido": new_user.apellido,
        "mail": new_user.mail
    })

# ==========================================
# UPDATE USER (PUT - completo)
# ==========================================
def update_user_full(id: int, user: UserSchema, db: Session):
    user_db = db.query(User).filter(User.id_user == id).first()

    if not user_db:
        return api_response(False, "Usuario no encontrado")

    user_db.nombre = format_text(user.nombre)
    user_db.apellido = format_text(user.apellido)
    user_db.identificacion = user.identificacion
    user_db.id_identificacion = user.id_identificacion
    user_db.mail = user.mail.strip().lower()
    user_db.msisdn = user.msisdn
    user_db.direccion = format_text(user.direccion)
    user_db.fecha_de_nacimiento = user.fecha_de_nacimiento
    user_db.estado = user.estado
    user_db.contrasena = pwd_context.hash(user.contrasena)
    user_db.id_departamento = user.id_departamento
    user_db.id_project = user.id_project
    user_db.id_rol = user.id_rol

    db.commit()
    db.refresh(user_db)

    return api_response(True, "Usuario actualizado", {
        "id_user": user_db.id_user,
        "nombre": user_db.nombre,
        "apellido": user_db.apellido,
        "mail": user_db.mail
    })

# ==========================================
# UPDATE USER (PATCH - parcial)
# ==========================================
def update_user(id: int, user, db: Session):
    user_db = db.query(User).filter(User.id_user == id).first()

    if not user_db:
        return api_response(False, "Usuario no encontrado")

    update_data = user.model_dump(exclude_unset=True)

    campos_texto = ["nombre", "apellido", "direccion"]
    campos_lower = ["mail"]

    for key, value in update_data.items():
        if key == "contrasena" and value is not None:
            value = pwd_context.hash(value)
        elif key in campos_texto and value is not None:
            value = format_text(value)
        elif key in campos_lower and value is not None:
            value = value.strip().lower()
        setattr(user_db, key, value)

    db.commit()
    db.refresh(user_db)

    return api_response(True, "Usuario actualizado", {
        "id_user": user_db.id_user,
        "nombre": user_db.nombre,
        "apellido": user_db.apellido,
        "mail": user_db.mail
    })

# ==========================================
# DELETE USER
# ==========================================
def delete_user(id: int, db: Session):
    user = db.query(User).filter(User.id_user == id).first()

    if not user:
        return api_response(False, "Usuario no encontrado")

    db.delete(user)
    db.commit()

    return api_response(True, "Usuario eliminado")

# ==========================================
# REMOVER USUARIO DE UN PROYECTO (sin borrar la cuenta)
# ==========================================
def remove_user_from_project(
    id_user: int,
    id_project: str,
    acting_user_id: int,
    db: Session,
):
    vinculo = db.query(UserProject).filter(
        UserProject.id_user == id_user,
        UserProject.id_project == id_project
    ).first()

    if not vinculo:
        return api_response(False, "El usuario no pertenece a este proyecto")

    if id_user == acting_user_id:
        return api_response(False, "No puedes quitarte a ti mismo del proyecto", error="SELF_REMOVAL")

    if vinculo.id_rol == 1001:
        admins = db.query(UserProject).filter(
            UserProject.id_project == id_project,
            UserProject.id_rol == 1001,
        ).count()
        if admins <= 1:
            return api_response(False, "No puedes quitar al último administrador del proyecto", error="LAST_PROJECT_ADMIN")

    db.delete(vinculo)
    db.commit()

    return api_response(True, "Usuario removido del proyecto")

# ==========================================
# LOGIN
# ==========================================
def login_user(mail: str, contrasena: str, db: Session, remember_me: bool = False):
    normalized_mail = mail.strip().lower()
    user = db.query(User).filter(User.mail == normalized_mail).first()

    if not user:
        return api_response(False, "Correo no registrado", error="USER_NOT_FOUND")

    if not pwd_context.verify(contrasena, user.contrasena):
        return api_response(False, "Contraseña incorrecta", error="INVALID_PASSWORD")

    # id_client viene directo del usuario (se asigna en el registro). Si
    # por algun motivo un usuario viejo no lo tiene (invitado antes de
    # este fix, por ejemplo), se recurre al respaldo de mirar su primer
    # proyecto, igual que antes.
    id_client = user.id_client
    if id_client is None:
        user_project = db.query(UserProject).filter(UserProject.id_user == user.id_user).first()
        if user_project:
            project = db.query(Project).filter(Project.id_project == user_project.id_project).first()
            if project:
                id_client = project.id_client

    user.ultimo_acceso = func.now()
    db.commit()

    token = create_access_token(
        {"id_user": user.id_user, "id_rol": user.id_rol},
        REMEMBER_TOKEN_EXPIRE_MINUTES if remember_me else ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    return api_response(True, "Login exitoso", {
        "id_user": user.id_user,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "mail": user.mail,
        "id_rol": user.id_rol,
        "id_client": id_client,
        "estado": user.estado,
        "access_token": token,
        "token_type": "bearer"
    })

# ==========================================
# RECOVER PASSWORD (enviar código)
# ==========================================
def recover_password(mail: str, db: Session):
    normalized_mail = mail.strip().lower()
    user = db.query(User).filter(User.mail == normalized_mail).first()

    if not user:
        return api_response(False, "Correo no registrado", error="USER_NOT_FOUND")

    codigo = ''.join(random.choices(string.digits, k=6))

    recovery_codes[normalized_mail] = {
        "codigo": codigo,
        "expira": datetime.now() + timedelta(minutes=15)
    }

    enviado = send_recovery_email(normalized_mail, codigo)

    if not enviado:
        return api_response(False, "Error al enviar correo", error="MAIL_ERROR")

    return api_response(True, "Código de recuperación enviado al correo")


def verify_recovery_code(mail: str, codigo: str):
    normalized_mail = mail.strip().lower()

    if normalized_mail not in recovery_codes:
        return api_response(False, "No hay solicitud de recuperación", error="NO_REQUEST")

    datos = recovery_codes[normalized_mail]

    if datetime.now() > datos["expira"]:
        del recovery_codes[normalized_mail]
        return api_response(False, "Código expirado", error="CODE_EXPIRED")

    if datos["codigo"] != codigo.strip():
        return api_response(False, "Código incorrecto", error="INVALID_CODE")

    return api_response(True, "Código verificado correctamente")

# ==========================================
# RESET PASSWORD (cambiar contraseña)
# ==========================================
def reset_password(mail: str, codigo: str, nueva_contrasena: str, db: Session):
    normalized_mail = mail.strip().lower()

    if normalized_mail not in recovery_codes:
        return api_response(False, "No hay solicitud de recuperación", error="NO_REQUEST")

    datos = recovery_codes[normalized_mail]

    if datetime.now() > datos["expira"]:
        del recovery_codes[normalized_mail]
        return api_response(False, "Código expirado", error="CODE_EXPIRED")

    if datos["codigo"] != codigo:
        return api_response(False, "Código incorrecto", error="INVALID_CODE")

    user = db.query(User).filter(User.mail == normalized_mail).first()

    if not user:
        return api_response(False, "Usuario no encontrado", error="USER_NOT_FOUND")

    user.contrasena = pwd_context.hash(nueva_contrasena)
    db.commit()
    db.refresh(user)

    del recovery_codes[normalized_mail]

    return api_response(True, "Contraseña actualizada correctamente")

# ==========================================
# REGISTER (Client + User)
# ==========================================
def register(data, db: Session):
    normalized_email_empresa = data.email_empresa.strip().lower()
    normalized_mail = data.mail.strip().lower()
    normalized_id = data.id_document.strip()

    existing_client = db.query(Client).filter(Client.email == normalized_email_empresa).first()
    if existing_client:
        return api_response(False, "La empresa ya está registrada", error="DUPLICATE_CLIENT")

    existing_user = db.query(User).filter(User.mail == normalized_mail).first()
    if existing_user:
        return api_response(False, "El correo del usuario ya está registrado", error="DUPLICATE_USER")

    existing_id = db.query(User).filter(User.id_identificacion == normalized_id).first()
    if existing_id:
        return api_response(
            False,
            "El número de identificación ya está registrado. Verifica el documento ingresado.",
            error="DUPLICATE_ID",
        )

    try:
        new_client = Client(
            document=data.document,
            razon_social=format_text(data.razon_social),
            representante_legal=format_text(data.representante_legal),
            email=normalized_email_empresa,
            address=format_text(data.address),
            telephone=data.telephone,
            number_cellphone=data.number_cellphone,
            id_document=data.id_document
        )

        db.add(new_client)
        db.flush()

        hashed_password = pwd_context.hash(data.contrasena)

        new_user = User(
            nombre=format_text(data.nombre),
            apellido=format_text(data.apellido),
            identificacion="CC",
            id_identificacion=normalized_id,
            mail=normalized_mail,
            msisdn=data.msisdn,
            direccion=format_text(data.address) if data.address else "",
            fecha_de_nacimiento=datetime.combine(data.fecha_de_nacimiento, datetime.min.time()),
            estado="activo",
            fecha_de_creacion=datetime.now(),
            ultimo_acceso=datetime.now(),
            contrasena=hashed_password,
            id_departamento=None,
            id_client=new_client.id_cliente,
            id_project=None,
            id_rol=1001
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        db.refresh(new_client)

        token = create_access_token({"id_user": new_user.id_user, "id_rol": new_user.id_rol})

        return api_response(True, "Registro exitoso", {
            "id_user": new_user.id_user,
            "nombre": new_user.nombre,
            "apellido": new_user.apellido,
            "mail": new_user.mail,
            "id_cliente": new_client.id_cliente,
            "razon_social": new_client.razon_social,
            "access_token": token,
            "token_type": "bearer"
        })

    except IntegrityError as e:
        db.rollback()
        database_error = str(getattr(e.orig, "args", ("", ""))[-1]).lower()
        if "id_identificacion" in database_error:
            return api_response(
                False,
                "El número de identificación ya está registrado. Verifica el documento ingresado.",
                error="DUPLICATE_ID",
            )
        if "mail" in database_error:
            return api_response(False, "El correo del usuario ya está registrado", error="DUPLICATE_USER")
        if "email" in database_error:
            return api_response(False, "La empresa ya está registrada", error="DUPLICATE_CLIENT")
        return api_response(
            False,
            "No se pudo completar el registro por un conflicto con los datos. Verifica la información e inténtalo de nuevo.",
            error="REGISTRATION_CONFLICT",
        )
    except Exception as e:
        db.rollback()
        print("Error en registro:", type(e).__name__)
        return api_response(
            False,
            "No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.",
            error="REGISTRATION_ERROR",
        )

# ==========================================
# 2FA - VERIFICAR SI DISPOSITIVO NECESITA 2FA
# ==========================================
def check_2fa_required(mail: str, device_id: str):
    return api_response(True, "Se requiere verificación", {
        "requires_2fa": True
    })

# ==========================================
# 2FA - ENVIAR CODIGO
# ==========================================
def send_2fa_code(mail: str, device_id: str, db: Session):
    user = db.query(User).filter(User.mail == mail).first()

    if not user:
        return api_response(False, "Usuario no encontrado", error="USER_NOT_FOUND")

    codigo = ''.join(random.choices(string.digits, k=6))

    two_factor_codes[mail] = {
        "codigo": codigo,
        "device_id": device_id,
        "expira": datetime.now() + timedelta(minutes=10)
    }

    enviado = send_2fa_email(mail, codigo)

    if not enviado:
        return api_response(False, "Error al enviar código", error="MAIL_ERROR")

    return api_response(True, "Código de verificación enviado al correo", {
        "requires_2fa": True
    })

# ==========================================
# 2FA - VERIFICAR CODIGO
# ==========================================
def verify_2fa_code(mail: str, codigo: str, device_id: str, db: Session, remember_me: bool = False):
    if mail not in two_factor_codes:
        return api_response(False, "No hay código de verificación pendiente", error="NO_CODE")

    datos = two_factor_codes[mail]

    if datetime.now() > datos["expira"]:
        del two_factor_codes[mail]
        return api_response(False, "Código expirado", error="CODE_EXPIRED")

    if datos["codigo"] != codigo:
        return api_response(False, "Código incorrecto", error="INVALID_CODE")

    key = f"{mail}:{device_id}"
    verified_devices[key] = datetime.now() + timedelta(hours=5)

    del two_factor_codes[mail]

    user = db.query(User).filter(User.mail == mail).first()

    user.ultimo_acceso = func.now()
    db.commit()

    id_client = user.id_client
    if id_client is None:
        user_project = db.query(UserProject).filter(UserProject.id_user == user.id_user).first()
        if user_project:
            project = db.query(Project).filter(Project.id_project == user_project.id_project).first()
            if project:
                id_client = project.id_client

    token = create_access_token(
        {"id_user": user.id_user, "id_rol": user.id_rol},
        REMEMBER_TOKEN_EXPIRE_MINUTES if remember_me else ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    return api_response(True, "Verificación exitosa", {
        "id_user": user.id_user,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "mail": user.mail,
        "id_rol": user.id_rol,
        "id_client": id_client,
        "estado": user.estado,
        "device_verified": True,
        "access_token": token,
        "token_type": "bearer"
    })

# ==========================================
# INVITE USERS
# ==========================================
def invite_users(
    correos: list,
    id_project: str,
    id_client: int,
    id_rol: int,
    invited_by_user_id: int,
    db: Session,
    departamento: str | None = None,
    nombres: dict | None = None,
):
    project = db.query(Project).filter(Project.id_project == id_project).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado")

    is_project_admin = db.query(UserProject).filter(
        UserProject.id_user == invited_by_user_id,
        UserProject.id_project == id_project,
        UserProject.id_rol == 1001,
    ).first()
    if not is_project_admin or id_client != project.id_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes invitar usuarios a este proyecto",
        )

    if id_rol not in {1001, 1002, 1003, 1004, 1005}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rol de proyecto no válido")

    usuarios_creados = []
    errores = []
    nombres_normalizados = {
        correo.strip().lower(): datos
        for correo, datos in (nombres or {}).items()
        if correo.strip()
    }

    for correo_input in correos:
        correo = correo_input.strip().lower()
        if not correo:
            continue

        existing = db.query(User).filter(User.mail == correo).first()
        nombre_invitado = nombres_normalizados.get(correo)

        if existing:
            existing_link = db.query(UserProject).filter(
                UserProject.id_user == existing.id_user,
                UserProject.id_project == id_project
            ).first()

            if existing_link:
                errores.append({
                    "mail": correo,
                    "error": "Usuario ya está en el proyecto"
                })
                continue

            if (
                (existing.estado or "").lower() == "pendiente"
                and nombre_invitado
                and nombre_invitado.nombre.strip()
                and nombre_invitado.apellido.strip()
            ):
                existing.nombre = format_text(nombre_invitado.nombre)
                existing.apellido = format_text(nombre_invitado.apellido)

            user_project = UserProject(
                id_user=existing.id_user,
                id_project=id_project,
                id_rol=id_rol,
                departamento=departamento.strip() or None if departamento else None,
            )
            db.add(user_project)
            db.flush()

            try:
                enviado = send_invitation_email(correo, project.project_name, "Ya tienes cuenta, usa tu contraseña actual")
            except:
                enviado = False

            usuarios_creados.append({
                "id_user": existing.id_user,
                "mail": correo,
                "invitacion_enviada": enviado,
                "usuario_existente": True
            })
            continue

        if not nombre_invitado or not nombre_invitado.nombre.strip() or not nombre_invitado.apellido.strip():
            errores.append({
                "mail": correo,
                "error": "Indica el nombre y apellido de la persona invitada"
            })
            continue

        contrasena_temporal = ''.join(random.choices(
            string.ascii_letters + string.digits, k=10
        ))

        try:
            new_user = User(
                nombre=format_text(nombre_invitado.nombre),
                apellido=format_text(nombre_invitado.apellido),
                identificacion="CC",
                id_identificacion=f"TEMP-{correo}",
                mail=correo.strip().lower(),
                msisdn="",
                direccion="",
                fecha_de_nacimiento=datetime.now(),
                estado="pendiente",
                fecha_de_creacion=datetime.now(),
                ultimo_acceso=datetime.now(),
                contrasena=pwd_context.hash(contrasena_temporal),
                id_departamento=None,
                id_project=None,
                id_client=project.id_client,
                id_rol=1005
            )

            db.add(new_user)
            db.flush()

            user_project = UserProject(
                id_user=new_user.id_user,
                id_project=id_project,
                id_rol=id_rol,
                departamento=departamento.strip() or None if departamento else None,
            )
            db.add(user_project)
            db.flush()

            try:
                enviado = send_invitation_email(correo, project.project_name, contrasena_temporal)
            except Exception as mail_error:
                print(f"Error enviando correo a {correo}: {mail_error}")
                enviado = False

            usuarios_creados.append({
                "id_user": new_user.id_user,
                "mail": correo,
                "invitacion_enviada": enviado,
                "usuario_existente": False
            })

        except Exception as e:
            errores.append({
                "mail": correo,
                "error": str(e)
            })
            continue

    db.commit()

    return api_response(True, "Proceso de invitación completado", {
        "usuarios_creados": usuarios_creados,
        "errores": errores,
        "total_invitados": len(usuarios_creados),
        "total_errores": len(errores)
    })


def complete_invited_user(id_user: int, data, db: Session):
    user = db.query(User).filter(User.id_user == id_user).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if (user.estado or "").lower() != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La cuenta no tiene un registro de invitación pendiente",
        )

    normalized_id = data.id_identificacion.strip()
    existing_id = db.query(User).filter(
        User.id_identificacion == normalized_id,
        User.id_user != id_user,
    ).first()
    if existing_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El número de identificación ya está registrado",
        )

    user.nombre = format_text(data.nombre)
    user.apellido = format_text(data.apellido)
    user.identificacion = data.identificacion
    user.id_identificacion = normalized_id
    user.msisdn = data.msisdn.strip()
    user.direccion = format_text(data.direccion)
    user.fecha_de_nacimiento = datetime.combine(data.fecha_de_nacimiento, datetime.min.time())
    user.contrasena = pwd_context.hash(data.contrasena)
    user.estado = "activo"

    db.commit()
    db.refresh(user)

    return api_response(True, "Cuenta activada correctamente", {
        "id_user": user.id_user,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "mail": user.mail,
        "estado": user.estado,
    })

# ==========================================
# GET USERS BY PROJECT
# ==========================================
def get_users_by_project(id_project: str, db: Session):
    user_projects = db.query(User, UserProject.id_rol, UserProject.departamento, UserProject.cargo).join(
        UserProject, User.id_user == UserProject.id_user
    ).filter(UserProject.id_project == id_project).all()

    users_list = [
        {
            "id_user": user.id_user,
            "nombre": user.nombre,
            "apellido": user.apellido,
            "mail": user.mail,
            "msisdn": user.msisdn,
            "estado": user.estado,
            "id_rol": rol,
            "departamento": departamento,
            "cargo": cargo,
            "id_project": id_project
        }
        for user, rol, departamento, cargo in user_projects
    ]
    return api_response(True, "Usuarios del proyecto", users_list)

# ==========================================
# UPDATE USER-PROJECT MEMBERSHIP (departamento / cargo / id_rol)
# ==========================================
def update_user_project_membership(
    id_user: int,
    id_project: str,
    data,
    acting_user_id: int,
    db: Session,
):
    membership = db.query(UserProject).filter(
        UserProject.id_user == id_user,
        UserProject.id_project == id_project
    ).first()

    if not membership:
        return api_response(False, "El usuario no pertenece a este proyecto", error="MEMBERSHIP_NOT_FOUND")

    update_data = data.model_dump(exclude_unset=True)
    if "id_rol" in update_data:
        if id_user == acting_user_id:
            return api_response(False, "No puedes cambiar tu propio rol de proyecto", error="SELF_ROLE_CHANGE")
        if membership.id_rol == 1001 and update_data["id_rol"] != 1001:
            admins = db.query(UserProject).filter(
                UserProject.id_project == id_project,
                UserProject.id_rol == 1001,
            ).count()
            if admins <= 1:
                return api_response(False, "No puedes quitar al último administrador del proyecto", error="LAST_PROJECT_ADMIN")

    for key, value in update_data.items():
        setattr(membership, key, value)

    db.commit()
    db.refresh(membership)

    return api_response(True, "Miembro actualizado", {
        "id_user": membership.id_user,
        "id_project": membership.id_project,
        "id_rol": membership.id_rol,
        "departamento": membership.departamento,
        "cargo": membership.cargo
    })

# ==========================================
# GET PROJECTS BY USER
# ==========================================
def get_user_projects(id_user: int, db: Session):
    projects = db.query(Project, UserProject.id_rol).join(
        UserProject, Project.id_project == UserProject.id_project
    ).filter(UserProject.id_user == id_user).all()

    result = [
        {
            "id_project": project.id_project,
            "project_name": project.project_name,
            "formato_de_produccion": project.formato_de_produccion,
            "genero": project.genero,
            "director": project.director,
            "id_client": project.id_client,
            "id_rol": rol
        }
        for project, rol in projects
    ]

    return api_response(True, "Proyectos del usuario", result)