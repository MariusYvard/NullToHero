#!/usr/bin/env node
// live-poll.mjs — long-poll the live daemon for the next browser event, or send
// an agent reply. Prints the event JSON. Default timeout 600000 ms.
//
// Poll:  live-poll.mjs [--timeout MS]
// Reply: live-poll.mjs --reply EVENT_ID done  [--file RELATIVE_PATH]
//        live-poll.mjs --reply EVENT_ID error "Short reason"
import { projectRoot, statePath, readJSON, httpJSON } from "./live-core.mjs";

const root = projectRoot();
const args = process.argv.slice(2);
const st = readJSON(statePath(root));
const out = (o) => { process.stdout.write(JSON.stringify(o) + "\n"); process.exit(0); };

if (!st || !st.port) out({ type: "error", error: "no_server", hint: "Run live.mjs first." });

const ri = args.indexOf("--reply");
if (ri >= 0) {
  const id = args[ri + 1];
  const status = args[ri + 2] || "done";
  const fi = args.indexOf("--file");
  const file = fi >= 0 ? args[fi + 1] : null;
  const reason = status === "error" ? (args[ri + 3] || args[args.length - 1]) : null;
  await httpJSON("POST", st.port, `/reply?token=${st.token}`, st.token, { id, status, file, reason });
  out({ ok: true, replied: id, status });
}

const ti = args.indexOf("--timeout");
const timeout = ti >= 0 ? Number(args[ti + 1]) : 600000;
try {
  const r = await httpJSON("GET", st.port, `/poll?token=${st.token}&timeout=${timeout}`, st.token);
  out(r.json || { type: "error", error: "empty_response" });
} catch (e) {
  out({ type: "error", error: "poll_failed", detail: String(e && e.message || e) });
}
