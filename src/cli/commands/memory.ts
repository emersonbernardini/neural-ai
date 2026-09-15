import type { Database } from "bun:sqlite";
import { MemoryService } from "../../memory/memoryService";
import { GlobalMemoryService } from "../../memory/globalMemoryService";
import type { MemoryType } from "../../core/types";

const UPDATABLE_FIELDS = ["content", "importance", "status"] as const;

const MEMORY_HELP = [
  'neural memory [--global] <subcommand> ...',
  "",
  "flag:",
  "  --global                                     operate on the global (cross-project) ledger instead of the local one",
  "",
  "subcommands:",
  '  add <type> "<content>"                       create a memory',
  "                                                type: discovery | decision | solution | bug | constraint |",
  "                                                      architecture | change | lesson | unresolved",
  "  list [type]                                  list memories, optionally filtered by type",
  "  show <id>                                    show a memory and its relationships",
  "  update <id> <field> <value>                  update one field of a memory",
  `                                                field: ${UPDATABLE_FIELDS.join(" | ")}`,
  "  delete <id>                                  delete a memory",
  "  help, --help, -h                             show this message",
  "",
  "ids accept either form: the full \"mem_<uuid>\" shown by `list`, or just the",
  "bare uuid — both resolve to the same memory.",
].join("\n");

function parseGlobalFlag(args: string[]): { global: boolean; remaining: string[] } {
  const globalIdx = args.indexOf("--global");
  if (globalIdx >= 0) {
    const remaining = args.slice(0, globalIdx).concat(args.slice(globalIdx + 1));
    return { global: true, remaining };
  }
  return { global: false, remaining: args };
}

export function runMemoryCommand(localDb: Database, globalDb: Database, args: string[]): string {
  const { global, remaining } = parseGlobalFlag(args);
  const [sub, ...rest] = remaining;

  if (sub === "help" || sub === "--help" || sub === "-h") {
    return MEMORY_HELP;
  }

  const service = global ? new GlobalMemoryService(globalDb) : new MemoryService(localDb);
  const scope = global ? "global" : "local";

  switch (sub) {
    case "add": {
      const [type, ...contentParts] = rest;
      const content = contentParts.join(" ");
      if (!type || !content) throw new Error(`usage: neural memory add [--global] <type> "<content>"`);
      const memory = service.add({ type: type as MemoryType, content, source: `cli:${scope}` });
      return `memory "${memory.id}" added (${scope})`;
    }
    case "list": {
      const [type] = rest;
      const memories = service.list(type ? { type: type as MemoryType } : undefined);
      return memories.length
        ? memories.map((m) => `${m.id} [${m.type}] (importance ${m.importance}) ${m.content}`).join("\n")
        : `(no ${scope} memories)`;
    }
    case "show": {
      const [id] = rest;
      if (!id) throw new Error("usage: neural memory show [--global] <id>");
      const memory = service.get(id);
      if (!memory) return `memory "${id}" not found in ${scope}`;
      const rels = service.relationships(id);
      const lines = [
        `id: ${memory.id}`,
        `type: ${memory.type}`,
        `importance: ${memory.importance}`,
        `status: ${memory.status}`,
        `content: ${memory.content}`,
        `scope: ${scope}`,
        `relationships (${rels.length}):`,
        ...rels.map((r) => `  - ${r.relation} -> ${r.targetType}:${r.targetId}`),
      ];
      return lines.join("\n");
    }
    case "update": {
      const [id, field, ...valueParts] = rest;
      const value = valueParts.join(" ");
      if (!id || !field) throw new Error("usage: neural memory update [--global] <id> <field> <value>");
      if (field === "importance") {
        service.update(id, { importance: Number(value) });
      } else if (field === "status") {
        service.update(id, { status: value as any });
      } else if (field === "content") {
        service.update(id, { content: value });
      } else {
        throw new Error(`unknown field "${field}" — valid fields: ${UPDATABLE_FIELDS.join(", ")} (type is fixed at creation and can't be changed)`);
      }
      return `memory "${id}" updated (${scope})`;
    }
    case "delete": {
      const [id] = rest;
      if (!id) throw new Error("usage: neural memory delete [--global] <id>");
      const removed = service.remove(id);
      return removed ? `memory "${id}" deleted (${scope})` : `memory "${id}" not found in ${scope}`;
    }
    default:
      throw new Error(`unknown memory subcommand "${sub}" — run "neural memory help" to see available subcommands`);
  }
}
