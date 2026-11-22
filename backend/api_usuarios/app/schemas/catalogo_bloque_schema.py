import re
from html.parser import HTMLParser
from typing import Literal

from pydantic import BaseModel, Field, model_validator


TipoBloque = Literal["accion", "dialogo", "parentesis", "transicion"]
ETIQUETAS = {"p", "div", "br", "hr", "h1", "h2", "h3", "ul", "ol", "li", "b", "strong",
             "i", "em", "u", "s", "strike", "sub", "sup", "mark", "blockquote", "span"}
VACIAS = {"br", "hr"}


class ValidadorHtml(HTMLParser):
    def __init__(self, tipo):
        super().__init__(convert_charrefs=True)
        self.tipo = tipo
        self.pila = []
        self.raices = 0
        self.texto = []
        self.valido = True

    def handle_starttag(self, tag, attrs):
        if tag not in ETIQUETAS or len(dict(attrs)) != len(attrs):
            self.valido = False
        if not self.pila:
            self.raices += 1
            if tag != "p" or dict(attrs).get("class") != f"gb gb-{self.tipo}":
                self.valido = False
        for nombre, valor in attrs:
            if nombre == "class" and valor and all(re.fullmatch(r"gb(?:-[a-z]+)?", c) for c in valor.split()):
                continue
            if nombre == "style" and valor and re.fullmatch(r"text-align:\s*(left|center|right|justify)\s*;?", valor, re.I):
                continue
            self.valido = False
        if tag not in VACIAS:
            self.pila.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VACIAS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.pila or self.pila[-1] != tag:
            self.valido = False
        else:
            self.pila.pop()

    def handle_data(self, data):
        if not self.pila and data.strip():
            self.valido = False
        self.texto.append(data)

    def handle_comment(self, data):
        self.valido = False

    def handle_decl(self, decl):
        self.valido = False

    def unknown_decl(self, data):
        self.valido = False


class CatalogoBloqueCrear(BaseModel):
    tipo: TipoBloque
    html: str = Field(min_length=1, max_length=30000)

    @model_validator(mode="after")
    def validar_html(self):
        parser = ValidadorHtml(self.tipo)
        parser.feed(self.html)
        parser.close()
        if not parser.valido or parser.pila or parser.raices != 1 or not "".join(parser.texto).strip():
            raise ValueError("El bloque debe contener texto y HTML seguro del tipo indicado")
        return self
