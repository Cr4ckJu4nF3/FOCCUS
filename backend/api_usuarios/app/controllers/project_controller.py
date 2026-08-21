from sqlalchemy.orm import Session
from app.models.project_model import Project
from app.schemas.project_schema import ProjectSchema
from app.utils.response import api_response
from app.models.user_model import User
from app.models.user_project_model import UserProject

# GET ALL PROJECTS

def get_projects(db: Session):
    projects = db.query(Project).all()
    projects_list = [
        {
            "id_project": p.id_project,
            "project_name": p.project_name,
            "formato_de_produccion": p.formato_de_produccion,
            "genero": p.genero,
            "sinopsis": p.sinopsis,
            "director": p.director,
            "id_client": p.id_client
        }
        for p in projects
    ]
    return api_response(True, "Lista de proyectos", projects_list)


# GET PROJECT BY ID

def get_project(id: str, db: Session):
    project = db.query(Project).filter(Project.id_project == id).first()

    if not project:
        return api_response(False, "Proyecto no encontrado")

    return api_response(True, "Proyecto encontrado", {
        "id_project": project.id_project,
        "project_name": project.project_name,
        "formato_de_produccion": project.formato_de_produccion,
        "genero": project.genero,
        "sinopsis": project.sinopsis,
        "director": project.director,
        "id_client": project.id_client
    })

# CREATE PROJECT

def create_project(project: ProjectSchema, db: Session):
    existing = db.query(Project).filter(Project.id_project == project.id_project).first()

    if existing:
        return api_response(False, "ID de proyecto ya existe", error="DUPLICATE_PROJECT")

    new_project = Project(
        id_project=project.id_project,
        project_name=project.project_name,
        formato_de_produccion=project.formato_de_produccion,
        genero=project.genero,
        sinopsis=project.sinopsis,
        director=project.director,
        id_client=project.id_client
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return api_response(True, "Proyecto creado", {
        "id_project": new_project.id_project,
        "project_name": new_project.project_name
    })


# UPDATE PROJECT (PUT)

def update_project_full(id: str, project: ProjectSchema, db: Session):
    project_db = db.query(Project).filter(Project.id_project == id).first()

    if not project_db:
        return api_response(False, "Proyecto no encontrado")

    project_db.project_name = project.project_name
    project_db.formato_de_produccion = project.formato_de_produccion
    project_db.genero = project.genero
    project_db.sinopsis = project.sinopsis
    project_db.director = project.director
    project_db.id_client = project.id_client

    db.commit()
    db.refresh(project_db)

    return api_response(True, "Proyecto actualizado", {
        "id_project": project_db.id_project,
        "project_name": project_db.project_name
    })


# UPDATE PROJECT (PATCH)

def update_project(id: str, project, db: Session):
    project_db = db.query(Project).filter(Project.id_project == id).first()

    if not project_db:
        return api_response(False, "Proyecto no encontrado")

    update_data = project.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(project_db, key, value)

    db.commit()
    db.refresh(project_db)

    return api_response(True, "Proyecto actualizado", {
        "id_project": project_db.id_project,
        "project_name": project_db.project_name
    })


# DELETE PROJECT

def delete_project(id: str, db: Session):
    project = db.query(Project).filter(Project.id_project == id).first()

    if not project:
        return api_response(False, "Proyecto no encontrado")

    db.delete(project)
    db.commit()

    return api_response(True, "Proyecto eliminado")


# GET PROJECTS BY CLIENT

def get_projects_by_client(id_client: int, db: Session):
    projects = db.query(Project).filter(Project.id_client == id_client).all()
    projects_list = [
        {
            "id_project": p.id_project,
            "project_name": p.project_name,
            "formato_de_produccion": p.formato_de_produccion,
            "genero": p.genero,
            "sinopsis": p.sinopsis,
            "director": p.director,
            "id_client": p.id_client
        }
        for p in projects
    ]
    return api_response(True, "Proyectos del cliente", projects_list)

# CREATE PROJECT

def create_project(project: ProjectSchema, db: Session):
    # Autogenerar id_project si viene vacío o no viene
    if not project.id_project or project.id_project.strip() == "":
        # Buscar el último proyecto para generar el siguiente ID
        last_project = db.query(Project).order_by(Project.id_project.desc()).first()

        if last_project and last_project.id_project.startswith("proj"):
            try:
                last_num = int(last_project.id_project.replace("proj", ""))
                new_num = last_num + 1
            except ValueError:
                new_num = 1
        else:
            new_num = 1

        project_id = f"proj{new_num:04d}"
    else:
        project_id = project.id_project

    # Verificar que no exista
    existing = db.query(Project).filter(Project.id_project == project_id).first()
    if existing:
        return api_response(False, "ID de proyecto ya existe", error="DUPLICATE_PROJECT")

    new_project = Project(
        id_project=project_id,
        project_name=project.project_name,
        formato_de_produccion=project.formato_de_produccion,
        genero=project.genero,
        sinopsis=project.sinopsis,
        director=project.director,
        id_client=project.id_client
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return api_response(True, "Proyecto creado", {
        "id_project": new_project.id_project,
        "project_name": new_project.project_name,
        "id_client": new_project.id_client
    })


# CREATE PROJECT AND LINK USER

def create_project_and_link(project: ProjectSchema, id_user: int, db: Session):
    # Crear el proyecto
    result = create_project(project, db)

    if not result["success"]:
        return result

    # Vincular el proyecto al usuario
    user = db.query(User).filter(User.id_user == id_user).first()

    if user:
        user.id_project = result["data"]["id_project"]
        db.commit()

    return api_response(True, "Proyecto creado y vinculado al usuario", {
        "id_project": result["data"]["id_project"],
        "project_name": result["data"]["project_name"],
        "id_client": result["data"]["id_client"],
        "id_user": id_user
    })

# CREATE PROJECT AND LINK USER

def create_project_and_link(project: ProjectSchema, id_user: int, db: Session):
    result = create_project(project, db)

    if not result["success"]:
        return result

    # Vincular en user_projects con rol administrador
    user_project = UserProject(
        id_user=id_user,
        id_project=result["data"]["id_project"],
        id_rol=1001
    )
    db.add(user_project)
    db.commit()

    return api_response(True, "Proyecto creado y vinculado al usuario", {
        "id_project": result["data"]["id_project"],
        "project_name": result["data"]["project_name"],
        "id_client": result["data"]["id_client"],
        "id_user": id_user
    })
    
