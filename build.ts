#!/usr/bin/env -S npx tsx
/** TeXConf年次ページをMarkdownソースから生成する。 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const ROOT = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = process.env.TEXCONF_HUB_ROOT
  ? resolve(process.env.TEXCONF_HUB_ROOT)
  : join(ROOT, "..", "texconf.github.io");
const TALKS_DIR = join(ROOT, "talks");
const MATERIALS_DIR = join(ROOT, "materials");
const PROGRAM_FILE = join(ROOT, "program.yaml");
const REGISTRATION_FILE = join(ROOT, "registration.yaml");
const INDEX_SRC = join(ROOT, "index.src.html");
const INDEX_OUT = join(ROOT, "index.html");
const HUB_INDEX_SRC = join(HUB_ROOT, "index.src.html");
const HUB_INDEX_OUT = join(HUB_ROOT, "index.html");

const MATERIAL_EXTENSIONS = [".pdf", ".pptx", ".zip", ".html", ".odp"] as const;

const MARKER_PROGRAM_START = "<!-- build:program:start -->";
const MARKER_PROGRAM_END = "<!-- build:program:end -->";
const MARKER_PREVIEW_START = "<!-- build:talk-preview:start -->";
const MARKER_PREVIEW_END = "<!-- build:talk-preview:end -->";

interface ProgramPart {
  id: string;
  heading: string;
  meta: string;
  talks: string[];
}

interface Talk {
  talkId: string;
  title: string;
  speaker: string;
  abstractHtml: string;
  materialsHref: string | null;
}

type RegistrationStatus = "open" | "nearly_full" | "sold_out" | "closed";

interface Registration {
  capacity: number;
  status: RegistrationStatus;
  peatixUrl: string;
}

const REGISTRATION_STATUSES: RegistrationStatus[] = [
  "open",
  "nearly_full",
  "sold_out",
  "closed",
];

const EVENT_STATUS_LABELS: Record<RegistrationStatus, string> = {
  open: "参加者募集中",
  nearly_full: "残りわずか",
  sold_out: "満席",
  closed: "募集終了",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadRegistration(): Registration {
  const data = parseYaml(readFileSync(REGISTRATION_FILE, "utf8")) as {
    capacity?: number;
    status?: string;
    peatix_url?: string;
  };

  const capacity = data.capacity;
  if (typeof capacity !== "number" || capacity <= 0) {
    throw new Error(`${REGISTRATION_FILE}に正のcapacityが必要です。`);
  }

  const status = data.status;
  if (!status || !REGISTRATION_STATUSES.includes(status as RegistrationStatus)) {
    throw new Error(
      `${REGISTRATION_FILE}のstatusは ${REGISTRATION_STATUSES.join(" | ")} のいずれかである必要があります。`,
    );
  }

  const peatixUrl = (data.peatix_url ?? "").trim();
  if (!peatixUrl) {
    throw new Error(`${REGISTRATION_FILE}にpeatix_urlが必要です。`);
  }

  return {
    capacity,
    status: status as RegistrationStatus,
    peatixUrl,
  };
}

function registrationCapacityText(registration: Registration): string {
  const base = `定員${registration.capacity}名`;
  if (registration.status === "nearly_full") {
    return `${base}（残りわずか）`;
  }
  if (registration.status === "sold_out") {
    return `${base}（満席）`;
  }
  return base;
}

function registrationMetaDescription(registration: Registration): string {
  const venue =
    "TeXConf 2026は2026年11月21日（土）13:30〜17:30、ちよだプラットフォームスクウェアで開催します。";
  const capacity = `定員${registration.capacity}名。`;

  switch (registration.status) {
    case "open":
      return `${venue}${capacity}Peatixで参加登録受付中。`;
    case "nearly_full":
      return `${venue}${capacity}Peatixで参加登録受付中（残りわずか）。`;
    case "sold_out":
      return `${venue}${capacity}満席のため募集を終了しました。`;
    case "closed":
      return `${venue}${capacity}募集を終了しました。`;
  }
}

function renderRegistration(registration: Registration): string {
  const sub = registrationCapacityText(registration);
  const closed = registration.status === "sold_out" || registration.status === "closed";
  const bannerClass = closed ? "reg-banner reg-banner-closed" : "reg-banner";
  const peatixLink = `<a href="${escapeHtml(registration.peatixUrl)}">Peatix</a>`;

  let main: string;
  if (registration.status === "open" || registration.status === "nearly_full") {
    main = `${peatixLink}でお申し込みください（学生の方もPeatixでの登録が必要です）`;
  } else if (registration.status === "sold_out") {
    main = "定員に達したため、募集を終了しました";
  } else {
    main = "募集を終了しました";
  }

  return `      <aside class="${bannerClass}" aria-labelledby="reg-banner-heading">
        <span class="reg-banner-label">参加登録</span>
        <div>
          <p class="reg-banner-main" id="reg-banner-heading">${main}</p>
          <p class="reg-banner-sub">${escapeHtml(sub)}</p>
        </div>
      </aside>`;
}

function renderEventStatus(registration: Registration): string {
  const label = EVENT_STATUS_LABELS[registration.status];
  const modifier =
    registration.status === "sold_out" || registration.status === "closed"
      ? " event-status-closed"
      : registration.status === "nearly_full"
        ? " event-status-limited"
        : "";
  return `<span class="event-status${modifier}">${escapeHtml(label)}</span>`;
}

function loadProgram(): ProgramPart[] {
  const data = parseYaml(readFileSync(PROGRAM_FILE, "utf8")) as {
    parts?: ProgramPart[];
  };
  if (!data?.parts) {
    throw new Error(`${PROGRAM_FILE}にpartsが必要です。`);
  }
  return data.parts;
}

function parseFrontmatter(text: string): [Record<string, string>, string] {
  if (!text.startsWith("---")) {
    return [{}, text.trim()];
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return [{}, text.trim()];
  }
  const meta = parseYaml(match[1]) as Record<string, unknown> | null;
  const body = match[2].trim();
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error("front matterはYAMLのマッピングである必要があります。");
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta)) {
    normalized[String(key)] = String(value);
  }
  return [normalized, body];
}

function renderInline(text: string): string {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`,
  );
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*(.+?)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  return escaped;
}

function renderMarkdown(body: string): string {
  if (!body.trim()) {
    return "<p>講演概要は後日掲載します。</p>";
  }

  const blocks = body.trim().split(/\n\s*\n/);
  const parts: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      const items = lines
        .map((line) => `<li>${renderInline(line.slice(2).trim())}</li>`)
        .join("");
      parts.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      const items = lines
        .map((line) =>
          `<li>${renderInline(line.replace(/^\d+\.\s+/, ""))}</li>`,
        )
        .join("");
      parts.push(`<ol>${items}</ol>`);
      continue;
    }

    const paragraph = lines.map((line) => line.trim()).join(" ");
    parts.push(`<p>${renderInline(paragraph)}</p>`);
  }

  return parts.join("\n");
}

function findMaterials(talkId: string): string | null {
  for (const ext of MATERIAL_EXTENSIONS) {
    const candidate = join(MATERIALS_DIR, `${talkId}${ext}`);
    if (existsSync(candidate)) {
      return `materials/${talkId}${ext}`;
    }
  }
  return null;
}

function loadTalk(talkId: string): Talk {
  const mdPath = join(TALKS_DIR, `${talkId}.md`);
  if (!existsSync(mdPath)) {
    throw new Error(`講演Markdownが見つかりません: ${mdPath}`);
  }

  const [meta, body] = parseFrontmatter(readFileSync(mdPath, "utf8"));
  const title = (meta.title ?? "").trim();
  const speaker = (meta.speaker ?? "").trim();
  if (!title || !speaker) {
    throw new Error(`${mdPath}のfront matterにtitleとspeakerが必要です。`);
  }

  return {
    talkId,
    title,
    speaker,
    abstractHtml: renderMarkdown(body),
    materialsHref: findMaterials(talkId),
  };
}

function renderTalkItem(talk: Talk): string {
  const materials = talk.materialsHref
    ? `\n                <p class="talk-materials"><a href="${escapeHtml(talk.materialsHref)}">発表資料</a></p>`
    : "";

  return `          <li>
            <!-- talk: ${escapeHtml(talk.talkId)} -->
            <details class="talk">
              <summary class="talk-summary">
                <span class="talk-title">${escapeHtml(talk.title)}</span>
                <span class="talk-speaker">${escapeHtml(talk.speaker)}</span>
              </summary>
              <div class="talk-abstract">
                ${talk.abstractHtml}${materials}
              </div>
            </details>
          </li>`;
}

function renderProgram(parts: ProgramPart[]): string {
  return parts
    .map((part) => {
      const talks = part.talks.map((talkId) => loadTalk(talkId));
      const items = talks.map(renderTalkItem).join("\n");
      return `    <section class="track-section" aria-labelledby="${escapeHtml(part.id)}-heading">
      <div class="track-header">
        <h2 id="${escapeHtml(part.id)}-heading">${escapeHtml(part.heading)}</h2>
        <p class="track-meta">${escapeHtml(part.meta)}</p>
      </div>
      <ul class="talk-list">
${items}
        </ul>
    </section>`;
    })
    .join("\n\n");
}

function renderTalkPreview(parts: ProgramPart[]): string {
  const rows: string[] = [];
  for (const part of parts) {
    for (const talkId of part.talks) {
      const talk = loadTalk(talkId);
      rows.push(
        `          <li>\n            <span class="talk-title">${escapeHtml(talk.title)}</span>\n            <span class="talk-speaker">${escapeHtml(talk.speaker)}</span>\n          </li>`,
      );
    }
  }
  return rows.join("\n");
}

function replaceMarkerBlock(
  source: string,
  start: string,
  end: string,
  content: string,
): string {
  const pattern = new RegExp(
    `${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );
  const replacement = `${start}\n${content}\n    ${end}`;
  const updated = source.replace(pattern, replacement);
  if (updated === source) {
    throw new Error(`マーカー ${start} / ${end} が見つかりません。`);
  }
  return updated;
}

function replaceMarkerInline(
  source: string,
  start: string,
  end: string,
  content: string,
): string {
  const pattern = new RegExp(
    `${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );
  const updated = source.replace(pattern, content);
  if (updated === source) {
    throw new Error(`マーカー ${start} / ${end} が見つかりません。`);
  }
  return updated;
}

function applyRegistration(source: string, registration: Registration): string {
  const metaDescription = registrationMetaDescription(registration);
  let updated = replaceMarkerBlock(
    source,
    "<!-- build:registration:start -->",
    "<!-- build:registration:end -->",
    renderRegistration(registration),
  );
  updated = replaceMarkerBlock(
    updated,
    "<!-- build:meta-description:start -->",
    "<!-- build:meta-description:end -->",
    `  <meta name="description" content="${escapeHtml(metaDescription)}">`,
  );
  updated = replaceMarkerBlock(
    updated,
    "<!-- build:og-description:start -->",
    "<!-- build:og-description:end -->",
    `  <meta property="og:description" content="${escapeHtml(metaDescription)}">`,
  );
  return updated;
}

function buildIndex(
  src: string,
  dest: string,
  parts: ProgramPart[],
  registration: Registration,
  options: { program: boolean; preview: boolean; registration: boolean },
): void {
  let source = readFileSync(src, "utf8");
  if (options.program) {
    source = replaceMarkerBlock(
      source,
      MARKER_PROGRAM_START,
      MARKER_PROGRAM_END,
      renderProgram(parts),
    );
  }
  if (options.preview) {
    source = replaceMarkerBlock(
      source,
      MARKER_PREVIEW_START,
      MARKER_PREVIEW_END,
      renderTalkPreview(parts),
    );
  }
  if (options.registration) {
    source = applyRegistration(source, registration);
  } else {
    source = replaceMarkerInline(
      source,
      "<!-- build:event-status:start -->",
      "<!-- build:event-status:end -->",
      renderEventStatus(registration),
    );
  }
  writeFileSync(dest, source, "utf8");
}

function main(): void {
  const hub = process.argv.includes("--hub");
  const parts = loadProgram();
  const registration = loadRegistration();

  buildIndex(INDEX_SRC, INDEX_OUT, parts, registration, {
    program: true,
    preview: false,
    registration: true,
  });
  console.log(`生成: ${INDEX_OUT}`);

  if (hub) {
    if (!existsSync(HUB_INDEX_SRC)) {
      console.warn(
        `警告: ${HUB_INDEX_SRC} がありません。入口ページは更新しません。`,
      );
    } else {
      buildIndex(HUB_INDEX_SRC, HUB_INDEX_OUT, parts, registration, {
        program: false,
        preview: true,
        registration: false,
      });
      console.log(`生成: ${HUB_INDEX_OUT}`);
    }
  }
}

main();
