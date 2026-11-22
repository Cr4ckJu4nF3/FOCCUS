import hashlib
from html.parser import HTMLParser

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.catalogo_bloque_model import CatalogoBloque


def serializar(bloque):
    return {"id_catalogo_bloque": bloque.id_bloque, "id_project": bloque.id_project,
            "tipo": bloque.tipo, "html": bloque.html}


class TextoHtml(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.partes = []

    def handle_data(self, data):
        self.partes.append(data)


def listar(db: Session, id_project: str, tipo: str | None, q: str | None):
    try:
        consulta = db.query(CatalogoBloque).filter(CatalogoBloque.id_project == id_project)
        if tipo:
            consulta = consulta.filter(CatalogoBloque.tipo == tipo)
        items = consulta.order_by(CatalogoBloque.id_bloque.desc()).all()
        if q:
            filtrados = []
            for item in items:
                parser = TextoHtml()
                parser.feed(item.html)
                if q.casefold() in "".join(parser.partes).replace("\xa0", " ").casefold():
                    filtrados.append(item)
            items = filtrados
        return [serializar(item) for item in items]
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="No se pudo consultar el catálogo")


def guardar(db: Session, id_project: str, data):
    digest = hashlib.sha256(data.html.encode("utf-8")).digest()

    def buscar():
        return db.query(CatalogoBloque).filter_by(
            id_project=id_project, tipo=data.tipo, html_sha256=digest
        ).first()

    try:
        existente = buscar()
        if existente:
            if existente.html != data.html:
                raise HTTPException(status_code=409, detail="Conflicto al identificar el bloque")
            return serializar(existente)
        bloque = CatalogoBloque(id_project=id_project, tipo=data.tipo, html=data.html, html_sha256=digest)
        db.add(bloque)
        db.commit()
        db.refresh(bloque)
        return serializar(bloque)
    except IntegrityError:
        db.rollback()
        try:
            existente = buscar()
            if existente and existente.html == data.html:
                return serializar(existente)
        except SQLAlchemyError:
            pass
        raise HTTPException(status_code=503, detail="No se pudo guardar el bloque")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=503, detail="No se pudo guardar el bloque")
