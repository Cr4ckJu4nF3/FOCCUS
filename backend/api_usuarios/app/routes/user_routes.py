from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.user_schema import (
    UserSchema,
    LoginSchema,
    UserUpdateSchema,
    RecoverSchema,
    ResetPasswordSchema,
    RegisterSchema,
    TwoFactorSendSchema,
    TwoFactorVerifySchema,
    InviteSchema
)

from app.controllers.user_controller import (
    get_users,
    get_user,
    create_user,
    update_user,
    update_user_full,
    delete_user,
    login_user,
    recover_password,
    reset_password,
    register,
    check_2fa_required,
    send_2fa_code,
    verify_2fa_code,
    invite_users,
    get_users_by_project,
    get_user_projects
)

# ROUTER
router = APIRouter()

# LOGIN
@router.post("/users/login")
def login(user: LoginSchema, db: Session = Depends(get_db)):
    return login_user(user.mail, user.contrasena, db)

# RECOVER PASSWORD
@router.post("/users/recover-password")
def recover(data: RecoverSchema, db: Session = Depends(get_db)):
    return recover_password(data.mail, db)

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
    return verify_2fa_code(data.mail, data.codigo, data.device_id, db)


# INVITE USERS

@router.post("/users/invite")
def invite(data: InviteSchema, db: Session = Depends(get_db)):
    return invite_users(data.correos, data.id_project, data.id_client, data.id_rol, db)

# GET ALL USERS
@router.get("/users")
def users(db: Session = Depends(get_db)):
    return get_users(db)

# CREATE USER
@router.post("/users")
def store_user(user: UserSchema, db: Session = Depends(get_db)):
    return create_user(user, db)


# GET USERS BY PROJECT

@router.get("/users/project/{id_project}")
def users_by_project(id_project: str, db: Session = Depends(get_db)):
    return get_users_by_project(id_project, db)


# GET PROJECTS BY USER

@router.get("/users/{id_user}/projects")
def user_projects(id_user: int, db: Session = Depends(get_db)):
    return get_user_projects(id_user, db)

# GET USER BY ID
@router.get("/users/{id}")
def user(id: int, db: Session = Depends(get_db)):
    return get_user(id, db)

# UPDATE USER (PUT)
@router.put("/users/{id}")
def edit_user(id: int, user: UserSchema, db: Session = Depends(get_db)):
    return update_user_full(id, user, db)

# UPDATE USER (PATCH)
@router.patch("/users/{id}")
def patch_user(id: int, user: UserUpdateSchema, db: Session = Depends(get_db)):
    return update_user(id, user, db)

# DELETE USER
@router.delete("/users/{id}")
def destroy_user(id: int, db: Session = Depends(get_db)):
    return delete_user(id, db)