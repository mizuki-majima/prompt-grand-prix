/**
 * GitHub Pages 用の転送ページを作る。
 * このゲームは PartyBox（mizuki-majima/PartyBox の grand-prix/）に統合したので、
 * 旧 URL に来た人を PartyBox の /grand-prix/ へ送る。
 *
 * 使い方: node redirect/build.mjs <出力先ディレクトリ>
 *   - 転送先は redirect/target-url.txt から読む（# で始まる行と空行は無視）
 *   - URL が書いてあれば <出力先>/index.html と 404.html を作り、redirect=true を出力する
 *   - 書いていなければ何も作らず redirect=false を出力する（いままでどおりゲームを公開する）
 *   - URL が正しくなければ失敗する（壊れた転送ページを公開しない）
 *   出力は GitHub Actions のステップ出力（$GITHUB_OUTPUT）にも書く。
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** target-url.txt の中身から PartyBox の URL を取り出す（無ければ null） */
export function readBaseUrl(text) {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l !== '' && !l.startsWith('#'));
  return line ?? null;
}

/** PartyBox の URL → プロンプト・グランプリのページの URL */
export function targetUrl(base) {
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`URL として読めません: ${base}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`http(s) の URL を書いてください: ${base}`);
  if (url.username || url.password) throw new Error(`ユーザー名やパスワードを含む URL は使えません: ${base}`);
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}/grand-prix/`;
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function redirectHtml(target) {
  const t = escapeHtml(target);
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${t}" />
    <link rel="canonical" href="${t}" />
    <title>プロンプト・グランプリは PartyBox に引っ越しました</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box;
        background: #bfe6ff; color: #2b2d42; font: 700 16px/1.8 'Hiragino Maru Gothic ProN', system-ui, sans-serif; text-align: center; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <p>プロンプト・グランプリは PartyBox に引っ越しました。<br />自動で移動しない場合は <a href="${t}">こちら</a> から遊べます。</p>
  </body>
</html>
`;
}

function main() {
  const outDir = process.argv[2];
  if (!outDir) throw new Error('使い方: node redirect/build.mjs <出力先ディレクトリ>');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const base = readBaseUrl(readFileSync(path.join(here, 'target-url.txt'), 'utf8'));
  const output = (redirect) => {
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `redirect=${redirect}\n`);
  };
  if (!base) {
    console.log('転送先が書かれていないので、いままでどおりゲームを公開します');
    output(false);
    return;
  }
  const target = targetUrl(base);
  const html = redirectHtml(target);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'index.html'), html);
  // 古いページやファイルの URL に来た人も同じく転送する
  writeFileSync(path.join(outDir, '404.html'), html);
  console.log(`転送ページを作りました → ${target}`);
  output(true);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
