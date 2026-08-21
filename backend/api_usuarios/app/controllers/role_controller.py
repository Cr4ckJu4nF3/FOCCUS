from sqlalchemy.orm import Session
from app.models.role_model import Role
from app.schemas.role_schema import RoleSchema
from app.utils.response import api_response


# GET ALL ROLES

def get_roles(db: Session):
    roles = db.query(Role).all()
    roles_list = [
        {
            "id_rol": r.id_rol,
            "nombre": r.nombre,
            "nivel_jerarquia": r.nivel_jerarquia,
            "descripcion": r.descripcion,
            "activo": r.activo
        }
        for r in roles
    ]
    return api_response(True, "Lista de roles", roles_list)


# GET ROLE BY ID

def get_role(id: int, db: Session):
    role = db.query(Role).filter(Role.id_rol == id).first()

    if not role:
        return api_response(False, "Rol no encontrado")

    return api_response(True, "Rol encontrado", {
        "id_rol": role.id_rol,
        "nombre": role.nombre,
        "nivel_jerarquia": role.nivel_jerarquia,
        "descripcion": role.descripcion,
        "activo": role.activo
    })


# CREATE ROLE

def create_role(role: RoleSchema, db: Session):
    existing = db.query(Role).filter(Role.nombre == role.nombre).first()

    if existing:
        return api_response(False, "Nombre de rol ya existe", error="DUPLICATE_ROLE")

    new_role = Role(
        nombre=role.nombre,
        nivel_jerarquia=role.nivel_jerarquia,
        descripcion=role.descripcion,
        activo=role.activo
    )

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return api_response(True, "Rol creado", {
        "id_rol": new_role.id_rol,
        "nombre": new_role.nombre
    })


# UPDATE ROLE (PUT)

def update_role_full(id: int, role: RoleSchema, db: Session):
    role_db = db.query(Role).filter(Role.id_rol == id).first()

    if not role_db:
        return api_response(False, "Rol no encontrado")

    role_db.nombre = role.nombre
    role_db.nivel_jerarquia = role.nivel_jerarquia
    role_db.descripcion = role.descripcion
    role_db.activo = role.activo

    db.commit()
    db.refresh(role_db)

    return api_response(True, "Rol actualizado", {
        "id_rol": role_db.id_rol,
        "nombre": role_db.nombre
    })


# UPDATE ROLE (PATCH)

def update_role(id: int, role, db: Session):
    role_db = db.query(Role).filter(Role.id_rol == id).first()

    if not role_db:
        return api_response(False, "Rol no encontrado")

    update_data = role.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(role_db, key, value)

    db.commit()
    db.refresh(role_db)

    return api_response(True, "Rol actualizado", {
        "id_rol": role_db.id_rol,
        "nombre": role_db.nombre
    })


# DELETE ROLE

def delete_role(id: int, db: Session):
    role = db.query(Role).filter(Role.id_rol == id).first()

    if not role:
        return api_response(False, "Rol no encontrado")

    db.delete(role)
    db.commit()

    return api_response(True, "Rol eliminado")