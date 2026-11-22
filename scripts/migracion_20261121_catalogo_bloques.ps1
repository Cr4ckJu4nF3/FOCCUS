param(
    [switch]$DryRun,
    [switch]$Apply
)

# Propuesta offline: no importa configuracion ni abre conexiones.
# -Apply queda bloqueado hasta implementar un ejecutor con backup y verificaciones.
if ($Apply) {
    [Console]::Error.WriteLine("APPLY BLOQUEADO: esta propuesta no conecta ni modifica ninguna BD.")
    exit 2
}

$ddl = @'
CREATE TABLE IF NOT EXISTS catalogo_bloques (
    id_bloque BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_project VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    tipo VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    html LONGTEXT CHARACTER SET utf8mb4 NOT NULL,
    html_sha256 BINARY(32) NOT NULL,
    creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id_bloque),
    UNIQUE KEY uq_catalogo_bloques_proyecto_tipo_hash (id_project, tipo, html_sha256),
    CONSTRAINT ck_catalogo_bloques_tipo CHECK (tipo IN ('accion', 'dialogo', 'parentesis', 'transicion')),
    CONSTRAINT fk_catalogo_bloques_proyecto FOREIGN KEY (id_project)
        REFERENCES projects (id_project) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4;
'@

Write-Output "DRY-RUN OFFLINE: sin acceso a BD; conteos reales desconocidos."
Write-Output "Propuesta: 1 tabla nueva, 1 clave unica, 1 FK; 0 filas nuevas y 0 backfill."
Write-Output "No ejecutar hasta verificar compatibilidad y backup segun docs/agentes/bd/MIGRACIONES.md."
Write-Output $ddl
