import type { Database } from "bun:sqlite";
import { MapService } from "../../map/mapService";
import type { MapEntityType, MapRelationType } from "../../core/types";

/**
 * Handles `neural map <subcommand> ...`.
 * Structured mutation commands only — there is intentionally no generic
 * `neural map update "<free text>"` primary path.
 */
export function runMapCommand(db: Database, args: string[]): string {
  const service = new MapService(db);
  const [sub, ...rest] = args;

  switch (sub) {
    case "add-module": {
      const [id, path, name] = rest;
      if (!id || !path) throw new Error("usage: neural map add-module <id> <path> [name]");
      const entity = service.addModule(id, path, { name });
      return `module "${entity.id}" added (path: ${entity.path})`;
    }
    case "add-entity": {
      const [id, type, path, name] = rest;
      if (!id || !type) throw new Error("usage: neural map add-entity <id> <type> [path] [name]");
      const entity = service.addEntity(id, type as MapEntityType, { path, name });
      return `entity "${entity.id}" (${entity.type}) added`;
    }
    case "add-relationship": {
      const [from, to, type] = rest;
      if (!from || !to || !type)
        throw new Error("usage: neural map add-relationship <from> <to> <type>");
      service.addRelationship(from, to, type as MapRelationType);
      return `relationship "${from}" -${type}-> "${to}" added`;
    }
    case "set-architecture": {
      const [pattern] = rest;
      if (!pattern) throw new Error("usage: neural map set-architecture <pattern>");
      service.setArchitecture(pattern);
      return `architecture set to "${pattern}"`;
    }
    case "set-constraint": {
      const description = rest.join(" ");
      if (!description) throw new Error("usage: neural map set-constraint <description>");
      service.setConstraint(description);
      return `constraint recorded`;
    }
    case "remove-entity": {
      const [id] = rest;
      if (!id) throw new Error("usage: neural map remove-entity <id>");
      const removed = service.removeEntity(id);
      return removed ? `entity "${id}" removed` : `entity "${id}" not found`;
    }
    case "show":
    case undefined: {
      const entities = service.listEntities();
      const architecture = service.getArchitecture();
      const constraints = service.listConstraints();
      const lines = [
        `architecture: ${architecture ?? "(not set)"}`,
        `entities (${entities.length}):`,
        ...entities.map((e) => `  - ${e.id} [${e.type}] ${e.path ?? ""} (${e.status})`),
        `constraints (${constraints.length}):`,
        ...constraints.map((c) => `  - ${c.description}`),
      ];
      return lines.join("\n");
    }
    default:
      throw new Error(`unknown map subcommand "${sub}"`);
  }
}
