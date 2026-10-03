#!/usr/bin/env node
/*
 * Grandad's Cold Snap: build a play-test copy of the game to publish as a claude.ai Artifact.
 *
 * The Artifact host wraps a page in its own <!doctype>, <html>, <head> and <body>, so this writes
 * index.html without those tags (its title, fonts, styles and scripts stay as they are). The game's
 * scripts and its offline copy of three.js are published next to it as supporting files, at the
 * same paths the page already uses.
 *
 * USAGE
 *   node tools/build-artifact.js [out]   writes the page (default build/artifact.html) and prints
 *                                        the supporting files to publish with it
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.resolve(root, process.argv[2] || 'build/artifact.html');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const strip = [/<!doctype html>\s*/i, /<html[^>]*>\s*/i, /<head>\s*/i, /<\/head>\s*/i, /<body[^>]*>\s*/i, /\s*<\/body>/i, /\s*<\/html>/i];
for (const re of strip) {
  if (!re.test(html)) throw new Error(`index.html no longer has ${re}: check the build still makes sense`);
  html = html.replace(re, '');
}
// the host's own head already has these
html = html.replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

const files = {};
for (const dir of ['js', 'vendor']) {
  for (const f of fs.readdirSync(path.join(root, dir)).sort()) if (f.endsWith('.js')) files[`${dir}/${f}`] = `${dir}/${f}`;
}
console.log(`Wrote ${path.relative(root, out)} (${Math.round(html.length / 1024)} KB).`);
console.log('Publish it with these supporting files (the Artifact tool\'s "files"):');
console.log(JSON.stringify(files, null, 2));
