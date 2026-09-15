import type { Database } from "bun:sqlite";
import { MapService } from "../../map/mapService";
import type { MapEntityType, MapRelationType } from "../../core/types";

const MAP_HELP = [
  "neural map <subcommand> ...",
  "",
  "subcommands:",
  "  add-module <id> <path> [name]              register a module entity",
  "  add-entity <id> <type> [path] [name]       register an entity",
  "                                              type: module | component | domain-entity | subsystem",
  "  add-relationship <from> <to> <type>        link two existing entities",
  "                                              type: depends-on | part-of | implements | related-to",
  "  remove-entity <id>                         remove an entity and any relationships that reference it",
  "  set-architecture <pattern>                 set the project-level architecture note",
  "  clear-architecture                         remove the architecture note entirely",
  "  set-constraint <description>               record a project-level constraint",
  "  remove-constraint <id>                     delete a constraint by the id shown in `neural map show`",
  "  show                                       print architecture, entities and constraints (default)",
  "  help, --help, -h                           show this message",
].join("\n");

/**
 * Handles `neural map <subcommand> ...`.
 * Structured mutation commands only — there is intentionally no generic
 * `neural map update "<free text>"` primary path.
 */
export function runMapCommand(db: Database, args: string[]): string {
  const service = new MapService(db);
  const [sub, ...rest] = args;

  switch (sub) {
    case "help":
    case "--help":
    case "-h":
      return MAP_HELP;
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
      // NOTE: check `=== undefined`, not falsy — an explicit empty string
      // ("") is a valid, intentional argument (see `clear-architecture`
      // below, which is the clearer way to reset it).
      const [pattern] = rest;
      if (pattern === undefined) throw new Error("usage: neural map set-architecture <pattern>");
      service.setArchitecture(pattern);
      return pattern === "" ? "architecture note set to an empty string" : `architecture set to "${pattern}"`;
    }
    case "clear-architecture": {
      const cleared = service.clearArchitecture();
      return cleared ? "architecture note cleared" : "architecture note was already unset";
    }
    case "set-constraint": {
      const description = rest.join(" ");
      if (!description) throw new Error("usage: neural map set-constraint <description>");
      const constraint = service.setConstraint(description);
      return `constraint recorded (id: ${constraint.id})`;
    }
    case "remove-constraint": {
      const [idRaw] = rest;
      if (!idRaw) throw new Error("usage: neural map remove-constraint <id>");
      const id = Number(idRaw);
      if (!Number.isInteger(id)) throw new Error(`invalid constraint id "${idRaw}" — use the numeric id shown in "neural map show"`);
      const removed = service.removeConstraint(id);
      return removed ? `constraint ${id} removed` : `constraint ${id} not found`;
    }
    case "remove-entity": {
      const [id] = rest;
      if (!id) throw new Error("usage: neural map remove-entity <id>");
      const removed = service.removeEntity(id);
      return removed ? `entity "${id}" removed (associated relationships removed too)` : `entity "${id}" not found`;
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
        ...constraints.map((c) => `  - [${c.id}] ${c.description}`),
      ];
      return lines.join("\n");
    }
    default:
      throw new Error(`unknown map subcommand "${sub}" — run "neural map help" to see available subcommands`);
  }
}
