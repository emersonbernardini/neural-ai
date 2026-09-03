[NÓ]
caminho: src/map/
responsabilidade: estado atual do projeto (entidades, relacionamentos, arquitetura, constraints)
arquivos:
  - mapRepository.ts — CRUD SQL puro sobre map_entities/map_relationships/map_constraints/map_meta
  - mapService.ts — API estruturada (addModule, addEntity, updateEntity, addRelationship,
    setArchitecture, setConstraint, removeEntity) + validação de id via util/ids
exports: MapService, MapRepository
depende_de: db, core, util (assertValidEntityId)
usado_por: cli/commands/map.ts
invariantes:
  - id de entidade nunca é path (assertValidEntityId rejeita "/" e "\\")
  - addRelationship rejeita entidades desconhecidas (from/to precisam existir)
status: confirmado
revisão: bootstrap inicial
