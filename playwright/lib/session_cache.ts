import fs from "node:fs/promises";
import path from "node:path";
import type {Cookie} from "@playwright/test";
import {writeFileAtomic} from "./atomic_write.ts";
import {STATE_DIR} from "./config.ts";

const SESSIONS_FILE = path.join(STATE_DIR, "sessions.json");

type SessionStore = Readonly<Record<string, readonly Cookie[]>>;

function key(serverURL: string, email: string) {
  return `${new URL(serverURL).origin} ${email}`;
}

/**
 * Disk-backed cache of session cookies keyed by the server and the user's email. Persists across
 * runs and across processes (always reads fresh, writes through on every `set`), so that the
 * rate-limited login endpoint is hit only when no cached cookies are available.
 */
class SessionManager {
  async get(serverURL: string, email: string): Promise<readonly Cookie[] | undefined> {
    return (await this.load())[key(serverURL, email)];
  }

  async set(serverURL: string, email: string, cookies: readonly Cookie[]): Promise<void> {
    const store = await this.load();
    await this.save({...store, [key(serverURL, email)]: cookies});
  }

  async forget(serverURL: string, email: string): Promise<void> {
    const {[key(serverURL, email)]: _, ...store} = await this.load();
    await this.save(store);
  }

  private async load(): Promise<SessionStore> {
    try {
      return JSON.parse(await fs.readFile(SESSIONS_FILE, "utf-8")) as SessionStore;
    } catch (e) {
      // Only a cache: an unparsable file is as good as none.
      if ((e as NodeJS.ErrnoException).code !== "ENOENT" && !(e instanceof SyntaxError)) {
        throw e;
      }
      return {};
    }
  }

  private async save(store: SessionStore): Promise<void> {
    await writeFileAtomic(SESSIONS_FILE, JSON.stringify(store, undefined, 2));
  }
}

export const sessions = new SessionManager();
