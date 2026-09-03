#!/usr/bin/env bash
# Dogfooding do neural-ai: popula o .neural-map/neural.db do PRÓPRIO repositório
# usando o CLI da ferramenta, refletindo o mapa markdown em .neural-map/*.md.
#
# Rode a partir da raiz do repo neural-ai:
#   chmod +x .neural-map/bootstrap.sh && ./.neural-map/bootstrap.sh

set -euo pipefail

NEURAL="bun run src/cli/index.ts"

echo "== neural init =="
$NEURAL init

echo "== módulos =="
$NEURAL map add-module core       src/core       "Core domain types"
$NEURAL map add-module db-layer   src/db         "SQLite storage, pragmas, migrations"
$NEURAL map add-module map-module src/map        "Neural map repository + service"
$NEURAL map add-module memory-module src/memory  "Neural memory repository + service"
$NEURAL map add-module retrieval  src/retrieval  "FTS5 search"
$NEURAL map add-module context-module src/context "ContextBuilder"
$NEURAL map add-module cli        src/cli        "CLI dispatcher + commands"
$NEURAL map add-module util       src/util       "ids + gitignore helpers"

echo "== relacionamentos =="
$NEURAL map add-relationship cli map-module depends-on
$NEURAL map add-relationship cli memory-module depends-on
$NEURAL map add-relationship cli retrieval depends-on
$NEURAL map add-relationship cli util depends-on
$NEURAL map add-relationship map-module db-layer depends-on
$NEURAL map add-relationship memory-module db-layer depends-on
$NEURAL map add-relationship retrieval db-layer depends-on
$NEURAL map add-relationship context-module retrieval depends-on
$NEURAL map add-relationship context-module memory-module depends-on
$NEURAL map add-relationship map-module core depends-on
$NEURAL map add-relationship memory-module core depends-on
$NEURAL map add-relationship retrieval core depends-on
$NEURAL map add-relationship context-module core depends-on

echo "== arquitetura e constraints =="
$NEURAL map set-architecture layered-cli-service-repository
$NEURAL map set-constraint "db/database.ts is the only module allowed to open a Database connection or set SQLite pragmas"
$NEURAL map set-constraint "map and memory ledgers must not auto-synchronize in V1"
$NEURAL map set-constraint "core must remain deterministic and free of any LLM/AI provider dependency"

echo "== resultado =="
$NEURAL map show
$NEURAL stats
