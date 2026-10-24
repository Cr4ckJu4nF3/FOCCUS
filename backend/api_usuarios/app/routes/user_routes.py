from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin, require_project_admin, require_project_member
from app.schemas.user_schema import (
    UserSchema,
    LoginSchema,
    UserUpdateSchema,
    RecoverSchema,
    ResetPasswordSchema,
    VerifyRecoveryCodeSchema,
    RegisterSchema,
    TwoFactorSendSchema,
    TwoFactorVerifySchema,
    InviteSchema,
    CompleteInvitationSchema,
    UserProjectUpdateSchema
)
from app.models.user_model import User

from app.controllers.user_controller import (
    get_users,
    get_user,
    create_user,
    update_user,
    update_user_full,
    delete_user,
    login_user,
    recover_password,
    verify_recovery_code,
    reset_password,
    register,
    check_2fa_required,
    send_2fa_code,
    verify_2fa_code,
    invite_users,
    complete_invited_user,
    get_users_by_project,
    get_user_projects,
    remove_user_from_project,
    update_user_project_membership
)

# ROUTER
router = APIRouter()

# ==========================================
# RUTAS PUBLICAS (no requieren token)
# ==========================================

# LOGIN
@router.post("/users/login")
def login(user: LoginSchema, db: Session = Depends(get_db)):
    return login_user(user.mail, user.contrasena, db, user.remember_me)

# RECOVER PASSWORD
@router.post("/users/recover-password")
def recover(data: RecoverSchema, db: Session = Depends(get_db)):
    return recover_password(data.mail, db)

# VERIFY RECOVERY CODE
@router.post("/users/verify-recovery-code")
def verify_recovery_code_route(data: VerifyRecoveryCodeSchema):
    return verify_recovery_code(data.mail, data.codigo)

# RESET PASSWORD
@router.post("/users/reset-password")
def reset(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    return reset_password(data.mail, data.codigo, data.nueva_contrasena, db)

# REGISTER USER AND CLIENT
@router.post("/register")
def register_user(data: RegisterSchema, db: Session = Depends(get_db)):
    return register(data, db)


# 2FA - VERIFICAR SI NECESITA 2FA
@router.post("/users/2fa/check")
def check_2fa(data: TwoFactorSendSchema, db: Session = Depends(get_db)):
    return check_2fa_required(data.mail, data.device_id)


# 2FA - ENVIAR CODIGO
@router.post("/users/2fa/send")
def send_2fa(data: TwoFactorSendSchema, db: Session = Depends(get_db)):
    return send_2fa_code(data.mail, data.device_id, db)


# 2FA - VERIFICAR CODIGO
@router.post("/users/2fa/verify")
def verify_2fa(data: TwoFactorVerifySchema, db: Session = Depends(get_db)):
    return verify_2fa_code(data.mail, data.codigo, data.device_id, db, data.remember_me)

# COMPLETE INVITED ACCOUNT
@router.post("/users/complete-invitation")
def complete_invitation(
    data: CompleteInvitationSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return complete_invited_user(current_user["id_user"], data, db)


# ==========================================
# RUTAS PROTEGIDAS (requieren token valido)
# ==========================================

# INVITE USERS
@router.post("/users/invite")
def invite(
    data: InviteSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
):
    return invite_users(
        data.correos,
        data.id_project,
        data.id_client,
        data.id_rol,
        current_user["id_user"],
        db,
        data.departamento,
        data.nombres,
    )

# GET ALL USERS (solo administradores: expone datos de todos los usuarios del sistema)
@router.get("/users")
def users(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return get_users(db)

# CREATE USER (solo administradores: permite fijar id_rol directamente)
@router.post("/users")
def store_user(
    user: UserSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return create_user(user, db)


# GET USERS BY PROJECT
@router.get("/users/project/{id_project}")
def users_by_project(
    id_project: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member)
):
    return get_users_by_project(id_project, db)


# GET PROJECTS BY USER
@router.get("/users/{id_user}/projects")
def user_projects(
    id_user: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if id_user != current_user["id_user"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes consultar tus propios proyectos",
        )
    return get_user_projects(id_user, db)

# GET USER BY ID
@router.get("/users/{id}")
def user(id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_user(id, db)

# UPDATE USER (PUT)
@router.put("/users/{id}")
def edit_user(
    id: int,
    user: UserSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return update_user_full(id, user, db)

# UPDATE USER (PATCH)
@router.patch("/users/{id}")
def patch_user(
    id: int,
    user: UserUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if id != current_user["id_user"]:
        account = db.query(User).filter(User.id_user == current_user["id_user"]).first()
        if not account or account.id_rol != 1001:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para modificar esta cuenta",
            )
    else:
        protected_fields = {"id_rol", "id_project", "id_departamento", "estado"}
        requested_fields = user.model_dump(exclude_unset=True)
        if protected_fields.intersection(requested_fields):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes modificar tus permisos ni tu vinculación a proyectos",
            )
    return update_user(id, user, db)

# DELETE USER (solo administradores)
@router.delete("/users/{id}")
def destroy_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return delete_user(id, db)

# REMOVER USUARIO DE UN PROYECTO (solo administradores, no borra la cuenta)
@router.delete("/users/{id_user}/project/{id_project}")
def remove_from_project(
    id_user: int,
    id_project: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
):
    return remove_user_from_project(id_user, id_project, db)

# ACTUALIZAR AREA/DEPARTAMENTO, CARGO O NIVEL DE ACCESO DE UN MIEMBRO
# (solo administradores; permite el "click para editar" del area/rol
# directamente en la tabla de Roles y Equipo)
@router.patch("/users/{id_user}/project/{id_project}")
def edit_membership(
    id_user: int,
    id_project: str,
    data: UserProjectUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
):
    return update_user_project_membership(id_user, id_project, data, db)

# ELIMINAR MI PROPIA CUENTA (cualquier usuario logueado, solo la suya)
@router.delete("/users/me/account")
def destroy_my_account(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return delete_user(current_user["id_user"], db)