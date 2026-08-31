# TeXConf 2026

2026年開催の公式ページと、開催後の発表資料の置き場です。公開 URL は <https://texconf.github.io/2026/> です。

恒常の入口は [`texconf.github.io`](https://github.com/texconf/texconf.github.io) です。

## 講演内容の更新

講演タイトル、登壇者名、概要は Markdown で管理します。編集後にビルドを実行すると `index.html` に反映されます。

### 1. 講演 Markdown を置く

`talks/` に、講演 ID と同じファイル名の Markdown を置きます。ファイル名は講演内容に依存させず、`talk-01` のように通し番号にします。並びと部の割り当ては `program.yaml` で定義します。

例: `talks/talk-02.md`

```markdown
---
title: LuaTeX-ja（再）入門
speaker: 北川弘典
---

概要本文を Markdown で書きます。段落は空行で区切ります。

- 箇条書きも使えます
- **太字** や [リンク](https://example.com/) も使えます
```

front matter の `title` が講演タイトル、`speaker` が登壇者名です。`---` の下が講演概要です。

### 2. 発表資料を置く（任意）

`materials/` に `<講演ID>.<拡張子>` という名前でファイルを置くと、概要欄に「発表資料」リンクが自動で付きます。

対応拡張子: `.pdf`, `.pptx`, `.zip`, `.html`, `.odp`

例: `materials/talk-02.pdf` → リンク先 `materials/talk-02.pdf`

### 3. ビルド

```bash
npm install                       # 初回のみ
npm run build                     # 2026 年ページを生成
npm run build:hub                 # 上に加え入口ページの講演一覧も更新
```

- 入力: `index.src.html`, `talks/*.md`, `program.yaml`
- 出力: `index.html`（GitHub Pages で公開するファイル）

`index.src.html` は固定部分のテンプレートです。プログラム欄はビルドで差し替わります。

## CI / GitHub Pages

### 2026 リポジトリ

| Workflow | 内容 |
|---|---|
| `ci.yml` | `npm run check` でビルドし、`index.html` がコミット済みか検証 |
| `pages.yml` | ビルド後に GitHub Pages へデプロイ |
| `sync-hub.yml` | 講演データ変更時、入口リポジトリの講演プレビューを更新 |

**Pages を有効にする手順（各リポジトリ）**

1. Settings → Pages → **Source: GitHub Actions**
2. Team 以上なら visibility を Private / Public から選択

**sync-hub.yml の設定**

`2026` リポジトリの Secrets に `TEXCONF_REPO_TOKEN` を登録する。`texconf.github.io` への write 権限付き fine-grained PAT または classic PAT。

### texconf.github.io リポジトリ

| Workflow | 内容 |
|---|---|
| `pages.yml` | 静的ファイルを GitHub Pages へデプロイ |

## ディレクトリ構成

```
2026/
  build.ts
  package.json
  program.yaml          # プログラム第1部・第2部と講演 ID の並び
  index.src.html        # ページテンプレート（編集可）
  index.html            # 生成物（build.ts の出力）
  talks/
    talk-01.md          # 講演ごとの Markdown（ID は内容に依存しない）
  materials/
    talk-01.pdf         # 発表資料（任意）
  style.css
```
