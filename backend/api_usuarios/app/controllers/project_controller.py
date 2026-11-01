import shutil
from pathlib import Path

from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.project_model import Project
from app.schemas.project_schema import ProjectSchema
from app.utils.response import api_response
from app.models.user_model import User
from app.models.user_project_model import UserProject
from app.models.Guion import Guion
from app.models.guion_version_model import GuionVersion
from app.models.guion_nota_model import GuionNota
from app.models.escena_model import Escena
from app.models.escena_version_model import EscenaVersion
from app.models.continuidad_foto_model import ContinuidadFoto
from app.models.desglose_model import Desglose
from app.models.desglose_requerimiento_model import DesgloseRequerimiento
from app.models.rodaje_model import Rodaje
from app.models.proceso_rodaje_model import ProcesoRodaje
from app.models.personajes_model import Personaje
from app.models.escenario_model import Escenario
from app.models.galeria_model import GaleriaItem
from app.models.escena_galeria_item_model import EscenaGaleriaItem
from app.models.galeria_lugar_personaje_model import GaleriaLugarPersonaje
from app.models.galeria_version_model import GaleriaVersion
from app.models.galeria_version_foto_model import GaleriaVersionFoto
from app.utils.file_storage import BASE_UPLOAD_DIR

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

    guion_ids = [
        guion_id
        for (guion_id,) in db.query(Guion.id_guion).filter(Guion.id_project == id).all()
    ]
    scene_ids = [
        scene_id
        for (scene_id,) in db.query(Escena.id_escena).join(
            Guion, Escena.id_guion == Guion.id_guion
        ).filter(Guion.id_project == id).all()
    ]
    scene_versions = db.query(EscenaVersion.id_escena_version).filter(
        EscenaVersion.id_escena.in_(scene_ids)
    ).all() if scene_ids else []
    scene_version_ids = [version_id for (version_id,) in scene_versions]
    desglose_ids = [
        desglose_id
        for (desglose_id,) in db.query(Escena.id_desglose).filter(
            Escena.id_escena.in_(scene_ids),
            Escena.id_desglose.is_not(None),
        ).all()
    ] if scene_ids else []
    rodaje_ids = [
        rodaje_id
        for (rodaje_id,) in db.query(Rodaje.id_rodaje).filter(Rodaje.id_project == id).all()
    ]
    galeria_ids = [
        galeria_id
        for (galeria_id,) in db.query(GaleriaItem.id_galeria).filter(GaleriaItem.id_project == id).all()
    ]

    upload_paths = set()
    if guion_ids:
        upload_paths.update(path for (path,) in db.query(GuionVersion.archivo).filter(
            GuionVersion.id_guion.in_(guion_ids),
            GuionVersion.archivo.is_not(None),
        ).all())
    if scene_version_ids:
        upload_paths.update(path for (path,) in db.query(ContinuidadFoto.archivo_path).filter(
            ContinuidadFoto.id_escena_version.in_(scene_version_ids),
        ).all())
    if galeria_ids:
        upload_paths.update(path for (path,) in db.query(GaleriaItem.archivo_path).filter(
            GaleriaItem.id_galeria.in_(galeria_ids),
            GaleriaItem.archivo_path != "",
        ).all())
    upload_paths.update(path for (path,) in db.query(GaleriaVersionFoto.archivo_path).filter(
        GaleriaVersionFoto.id_project == id,
    ).all())
    if rodaje_ids:
        upload_paths.update(path for (path,) in db.query(Rodaje.archivo).filter(
            Rodaje.id_rodaje.in_(rodaje_ids),
            Rodaje.archivo.is_not(None),
        ).all())
        upload_paths.update(path for (path,) in db.query(ProcesoRodaje.archivo).filter(
            ProcesoRodaje.id_rodaje.in_(rodaje_ids),
            ProcesoRodaje.archivo.is_not(None),
        ).all())

    upload_directories = [f"galeria/{id}"]
    upload_directories.extend(f"guiones/{guion_id}" for guion_id in guion_ids)
    upload_directories.extend(f"escenas/{scene_id}/continuidad" for scene_id in scene_ids)

    try:
        if scene_ids or galeria_ids:
            scene_gallery_filters = []
            if scene_ids:
                scene_gallery_filters.append(EscenaGaleriaItem.id_escena.in_(scene_ids))
            if galeria_ids:
                scene_gallery_filters.append(EscenaGaleriaItem.id_galeria.in_(galeria_ids))
            db.query(EscenaGaleriaItem).filter(
                or_(*scene_gallery_filters)
            ).delete(synchronize_session=False)
        if galeria_ids:
            db.query(GaleriaLugarPersonaje).filter(
                (GaleriaLugarPersonaje.id_lugar_galeria.in_(galeria_ids))
                | (GaleriaLugarPersonaje.id_personaje_galeria.in_(galeria_ids))
            ).delete(synchronize_session=False)
        if scene_version_ids:
            db.query(ContinuidadFoto).filter(
                ContinuidadFoto.id_escena_version.in_(scene_version_ids)
            ).delete(synchronize_session=False)
            db.query(EscenaVersion).filter(
                EscenaVersion.id_escena_version.in_(scene_version_ids)
            ).delete(synchronize_session=False)
        db.query(GaleriaVersionFoto).filter(
            GaleriaVersionFoto.id_project == id
        ).delete(synchronize_session=False)
        db.query(GaleriaVersion).filter(
            GaleriaVersion.id_project == id
        ).delete(synchronize_session=False)
        if guion_ids:
            guion_version_ids = [
                version_id
                for (version_id,) in db.query(GuionVersion.id_guion_version).filter(
                    GuionVersion.id_guion.in_(guion_ids)
                ).all()
            ]
            if guion_version_ids:
                db.query(GuionNota).filter(
                    GuionNota.id_guion_version.in_(guion_version_ids)
                ).delete(synchronize_session=False)
            db.query(Guion).filter(
                Guion.id_guion.in_(guion_ids)
            ).update(
                {Guion.id_guion_version_actual: None},
                synchronize_session=False,
            )
            db.query(GuionVersion).filter(
                GuionVersion.id_guion.in_(guion_ids)
            ).delete(synchronize_session=False)
        if desglose_ids:
            db.query(DesgloseRequerimiento).filter(
                DesgloseRequerimiento.id_desglose.in_(desglose_ids)
            ).delete(synchronize_session=False)
        if scene_ids:
            db.query(Escena).filter(Escena.id_escena.in_(scene_ids)).delete(synchronize_session=False)
        if desglose_ids:
            db.query(Desglose).filter(Desglose.id_desglose.in_(desglose_ids)).delete(synchronize_session=False)
        if rodaje_ids:
            db.query(ProcesoRodaje).filter(
                ProcesoRodaje.id_rodaje.in_(rodaje_ids)
            ).delete(synchronize_session=False)
        if galeria_ids:
            db.query(GaleriaItem).filter(GaleriaItem.id_galeria.in_(galeria_ids)).delete(synchronize_session=False)
        db.query(Personaje).filter(Personaje.id_project == id).delete(synchronize_session=False)
        db.query(Escenario).filter(Escenario.id_project == id).delete(synchronize_session=False)
        if guion_ids:
            db.query(Guion).filter(Guion.id_guion.in_(guion_ids)).delete(synchronize_session=False)
        if rodaje_ids:
            db.query(Rodaje).filter(Rodaje.id_rodaje.in_(rodaje_ids)).delete(synchronize_session=False)
        db.query(UserProject).filter(UserProject.id_project == id).delete(synchronize_session=False)
        db.query(User).filter(User.id_project == id).update(
            {User.id_project: None},
            synchronize_session=False,
        )
        db.delete(project)
        db.commit()
    except Exception:
        db.rollback()
        raise

    upload_root = Path(BASE_UPLOAD_DIR).resolve()
    cleanup_failures = []
    for relative_directory in upload_directories:
        directory = (upload_root / relative_directory).resolve()
        if directory.is_relative_to(upload_root) and directory.is_dir():
            try:
                shutil.rmtree(directory)
            except OSError as error:
                cleanup_failures.append(f"{relative_directory}: {error}")

    for relative_path in upload_paths:
        if not relative_path:
            continue
        file_path = (upload_root.parent / relative_path).resolve()
        if file_path.is_relative_to(upload_root) and file_path.is_file():
            try:
                file_path.unlink()
            except OSError as error:
                cleanup_failures.append(f"{relative_path}: {error}")

    if cleanup_failures:
        return api_response(
            False,
            "Los datos del proyecto fueron eliminados, pero algunos archivos no pudieron borrarse.",
            {"archivos_pendientes": cleanup_failures},
            error="FILE_CLEANUP_FAILED",
        )
    return api_response(True, "Proyecto y todo su contenido eliminados")


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
    
