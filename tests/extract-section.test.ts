/**
 * @file extract-section.test.ts
 * @description
 * scripts/extract-section.js の動作検証テスト。
 * 関数レベル（extractSection）および CLI 実行（引数・パイプ・終了コード）の両面から検証する。
 */

import { extractSection, decodeHtmlBuffer } from '../scripts/extract-section.js';
import { spawnSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('extractSection 関数テスト', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <div id="header"><h1>Header Title</h1></div>
        <div class="content">
          <p class="item">Item 1</p>
          <p class="item">Item 2</p>
          <span class="note">Note Text</span>
        </div>
        <div id="footer">Footer</div>
      </body>
    </html>
  `.trim();

  test('セレクタが空文字の場合は全体 HTML をそのまま返す', () => {
    expect(extractSection(sampleHtml, '')).toBe(sampleHtml);
    expect(extractSection(sampleHtml, '   ')).toBe(sampleHtml);
    expect(extractSection(sampleHtml, undefined)).toBe(sampleHtml);
  });

  test('単一要素にマッチする場合、その outer HTML を抽出する', () => {
    const result = extractSection(sampleHtml, '#header');
    expect(result).toBe('<div id="header"><h1>Header Title</h1></div>');
  });

  test('複数要素にマッチする場合、改行区切りで結合された outer HTML を抽出する', () => {
    const result = extractSection(sampleHtml, '.item');
    expect(result).toBe('<p class="item">Item 1</p>\n<p class="item">Item 2</p>');
  });

  test('子要素を含む要素の outer HTML を保持する', () => {
    const result = extractSection(sampleHtml, '.content');
    expect(result).toContain('<div class="content">');
    expect(result).toContain('<p class="item">Item 1</p>');
    expect(result).toContain('</div>');
  });

  test('マッチする要素が存在しない場合は Error をスローする', () => {
    expect(() => {
      extractSection(sampleHtml, '.nonexistent');
    }).toThrow('Selector ".nonexistent" did not match any elements');
  });

  test('Buffer 入力も正しくデコードして抽出できる', () => {
    const buffer = Buffer.from(sampleHtml, 'utf-8');
    const result = extractSection(buffer, '#footer');
    expect(result).toBe('<div id="footer">Footer</div>');
  });
});

describe('extract-section.js CLI 実行テスト', () => {
  const scriptPath = path.resolve('scripts/extract-section.js');
  let tempDir: string;
  let inputHtmlPath: string;

  const htmlContent = `<!DOCTYPE html>
<html>
  <body>
    <div id="target">Target Content</div>
    <ul class="list">
      <li class="item">Apple</li>
      <li class="item">Banana</li>
    </ul>
  </body>
</html>`;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-section-test-'));
    inputHtmlPath = path.join(tempDir, 'input.html');
    fs.writeFileSync(inputHtmlPath, htmlContent, 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('ファイル引数指定: セレクタにマッチして outputFile に出力される（終了コード 0）', () => {
    const outputHtmlPath = path.join(tempDir, 'output.html');
    const result = spawnSync('node', [scriptPath, '#target', inputHtmlPath, outputHtmlPath], {
      encoding: 'utf-8'
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputHtmlPath)).toBe(true);
    const content = fs.readFileSync(outputHtmlPath, 'utf-8');
    expect(content).toBe('<div id="target">Target Content</div>');
  });

  test('ファイル引数指定: 複数マッチ時、改行区切りで outputFile に出力される（終了コード 0）', () => {
    const outputHtmlPath = path.join(tempDir, 'output.html');
    const result = spawnSync('node', [scriptPath, '.item', inputHtmlPath, outputHtmlPath], {
      encoding: 'utf-8'
    });

    expect(result.status).toBe(0);
    const content = fs.readFileSync(outputHtmlPath, 'utf-8');
    expect(content).toBe('<li class="item">Apple</li>\n<li class="item">Banana</li>');
  });

  test('ファイル引数指定: 空セレクタ時、全体 HTML が outputFile に出力される（終了コード 0）', () => {
    const outputHtmlPath = path.join(tempDir, 'output.html');
    const result = spawnSync('node', [scriptPath, '', inputHtmlPath, outputHtmlPath], {
      encoding: 'utf-8'
    });

    expect(result.status).toBe(0);
    const content = fs.readFileSync(outputHtmlPath, 'utf-8');
    expect(content).toBe(htmlContent);
  });

  test('ファイル引数指定: セレクタがマッチしない場合、stderr にエラー出力し終了コード 1 で終了する', () => {
    const outputHtmlPath = path.join(tempDir, 'output.html');
    const result = spawnSync('node', [scriptPath, '.missing', inputHtmlPath, outputHtmlPath], {
      encoding: 'utf-8'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Selector ".missing" did not match any elements');
    expect(fs.existsSync(outputHtmlPath)).toBe(false);
  });

  test('パイプ指定: stdin から受け取って stdout に出力する（終了コード 0）', () => {
    const result = spawnSync('node', [scriptPath, '#target'], {
      input: htmlContent,
      encoding: 'utf-8'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('<div id="target">Target Content</div>');
  });

  test('パイプ指定: 空セレクタの場合、stdin の全 HTML をそのまま stdout に出力する（終了コード 0）', () => {
    const result = spawnSync('node', [scriptPath, ''], {
      input: htmlContent,
      encoding: 'utf-8'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(htmlContent);
  });

  test('パイプ指定: セレクタがマッチしない場合、終了コード 1 で終了する', () => {
    const result = spawnSync('node', [scriptPath, '.missing'], {
      input: htmlContent,
      encoding: 'utf-8'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Selector ".missing" did not match any elements');
  });

  test('存在しない入力ファイルを指定した場合、stderr にエラー出力し終了コード 1 で終了する', () => {
    const nonExistentPath = path.join(tempDir, 'not_found.html');
    const result = spawnSync('node', [scriptPath, '#target', nonExistentPath], {
      encoding: 'utf-8'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not exist');
  });
});
