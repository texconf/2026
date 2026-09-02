# TeXConf 2026

2026年開催の公式ページと、開催後の発表資料の置き場です。公開URLは <https://texconf.github.io/2026/> です。

恒常の入口は [`texconf.github.io`](https://github.com/texconf/texconf.github.io) です。

## 講演内容の更新

講演タイトル、登壇者名、概要はMarkdownで管理します。`main`へpushすると`pages.yml`がビルドして公開します。ローカル確認用に`npm run build`も使えます。

### 1. 講演Markdownを置く

`talks/`に、講演IDと同じファイル名のMarkdownを置きます。ファイル名は講演内容に依存させず、`talk-01`のように通し番号にします。並びと部の割り当ては`program.yaml`で定義します。

例: `talks/talk-02.md`

```markdown
---
title: LuaTeX-ja（再）入門
speaker: 北川弘典
---

概要本文をMarkdownで書きます。段落は空行で区切ります。

- 箇条書きも使えます
- **太字** や [リンク](https://example.com/) も使えます
```

front matterの`title`が講演タイトル、`speaker`が登壇者名です。`---`の下が講演概要です。

### 2. 発表資料を置く（任意）

`materials/`に`<講演ID>.<拡張子>`という名前でファイルを置くと、概要欄に「発表資料」リンクが自動で付きます。

対応拡張子: `.pdf`, `.pptx`, `.zip`, `.html`, `.odp`

例: `materials/talk-02.pdf` → リンク先 `materials/talk-02.pdf`

### 3. ビルド

```bash
npm install                       # 初回のみ
npm run build                     # 2026年ページを生成
npm run build:hub                 # 上に加え入口ページの講演一覧も更新
```

- 入力: `index.src.html`, `talks/*.md`, `program.yaml`
- 出力: `index.html`（ローカル確認用。公開は`pages.yml`がpush時にデプロイする）

`index.src.html`は固定部分のテンプレートです。プログラム欄はビルドで差し替わります。

入口ページの講演一覧を更新するときは`npm run build:hub`を実行し、生成された`texconf.github.io/index.html`をhubリポジトリへコミットします。

## GitHub Pages

| リポジトリ | Workflow | 内容 |
|---|---|---|
| 2026 | `pages.yml` | `main`へpushでビルドし`gh-pages`へデプロイ |
| texconf.github.io | `pages.yml` | `main`へpushでGitHub Pagesへデプロイ |

## ディレクトリ構成

```
2026/
  build.ts
  package.json
  program.yaml          # プログラム第1部と第2部、講演IDの並び
  index.src.html        # ページテンプレート（編集可）
  index.html            # 生成物（build.tsの出力）
  talks/
    talk-01.md          # 講演ごとのMarkdown（IDは内容に依存しない）
  materials/
    talk-01.pdf         # 発表資料（任意）
  style.css
```
