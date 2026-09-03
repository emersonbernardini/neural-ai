#!/usr/bin/env bun
// Minimal CLI foundation for neural-ai.
// Both a user-facing interface and the way the underlying architecture
// gets exercised, since automatic ingestion is intentionally out of scope.

import { join } from "node:path";
import { openDatabase, openGlobalDatabase } from "../db/database";
import { runInit } from "./commands/init";
import { runMapCommand } from "./commands/map";
import { runMemoryCommand } from "./commands/memory";
import { runSearchCommand } from "./commands/search";
import { runStatsCommand } from "./commands/stats";

const PROJECT_ROOT = process.cwd();
const NEURAL_DIR = join(PROJECT_ROOT, ".neural-map");
const DB_PATH = join(NEURAL_DIR, "neural.db");

function main() {
  const [, , command, ...rest] = process.argv;

  if (!command) {
    printHelp();
    process.exit(1);
  }

  try {
    const db = openDatabase({ path: DB_PATH });
    const globalDb = openGlobalDatabase();

    let output: string;
    switch (command) {
      case "init": {
        const result = runInit(db, PROJECT_ROOT, DB_PATH);
        const parts = [
          `initialized neural-ai at ${result.dbPath}`,
          result.gitignoreUpdated ? "(.gitignore updated)" : "(.gitignore already up to date)",
          result.agentsCreated ? "(AGENTS.md created)" : "(AGENTS.md already exists)",
        ];
        output = parts.join(" ");
        break;
      }
      case "map":
        output = runMapCommand(db, rest);
        break;
      case "memory":
        output = runMemoryCommand(db, globalDb, rest);
        break;
      case "search":
        output = runSearchCommand(db, globalDb, rest);
        break;
      case "stats":
        output = runStatsCommand(db);
        break;
      case "help":
      case "--help":
      case "-h":
        printHelp();
        db.close();
        globalDb.close();
        process.exit(0);
        return;
      default:
        db.close();
        globalDb.close();
        console.error(`unknown command "${command}"\n`);
        printHelp();
        process.exit(1);
        return;
    }

    console.log(output);
    db.close();
    globalDb.close();
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(
    [
      "neural-ai — local-first project knowledge & memory system",
      "",
      "usage:",
      "  neural init",
      "  neural map [add-module|add-entity|add-relationship|set-architecture|set-constraint|remove-entity|show] ...",
      '  neural memory [--global] [add|list|show|update|delete] ...',
      '  neural search "<query>"',
      "  neural stats",
    ].join("\n")
  );
}

main();
