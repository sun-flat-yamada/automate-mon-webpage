
import fs from "fs";
import path from "path";
import * as iconv from "iconv-lite";
import { execSync } from "child_process";

const LOG_DIR = "tests/logs_robustness";
const MOCK_UTF8 = path.join(LOG_DIR, "mock_utf8.html");
const MOCK_SJIS = path.join(LOG_DIR, "mock_sjis.html");
const DIST_MAIN = "dist/main.js";

// Clean and init
if (fs.existsSync(LOG_DIR)) {
  fs.rmSync(LOG_DIR, { recursive: true, force: true });
}
fs.mkdirSync(LOG_DIR, { recursive: true });

// 1. Create Mock Content (Standard Product Table)
const htmlTemplate = (charset) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="${charset}">
    <title>Mock Product Page (${charset})</title>
</head>
<body>
    <table>
        <tr>
            <th>No.</th>
            <th>品名・仕様</th>
            <th>価格</th>
        </tr>
        <tr>
            <td>Item-001</td>
            <td>Test Specification Data (${charset})</td>
            <td>\\10,000</td>
        </tr>
    </table>
</body>
</html>`;

// 2. Write UTF-8 File
fs.writeFileSync(MOCK_UTF8, htmlTemplate("utf-8"), "utf8");
console.log(`Created UTF-8 Mock: ${MOCK_UTF8}`);

// 3. Write Shift_JIS File
const sjisContent = iconv.encode(htmlTemplate("shift_jis"), "Shift_JIS");
fs.writeFileSync(MOCK_SJIS, sjisContent);
console.log(`Created Shift_JIS Mock: ${MOCK_SJIS}`);

// 4. Run Extractor against both
function runExtractor(targetUrl, outputPrefix) {
    const dataPath = path.join(LOG_DIR, `${outputPrefix}_data.json`);
    console.log(`\nRunning extractor for ${outputPrefix}...`);
    try {
        execSync(`node --loader ts-node/esm ${DIST_MAIN}`, {
            env: {
                ...process.env,
                TARGET_URL: `file://${path.resolve(targetUrl)}`,
                EXTRACTOR_TYPE: "dell-outlet",
                OUTPUT_DIR: LOG_DIR
            },
            stdio: 'pipe' // Capture output to avoid noise, handling errors manually
        });

        // Rename output data.json to keep it
        if (fs.existsSync(path.join(LOG_DIR, "data.json"))) {
            fs.renameSync(path.join(LOG_DIR, "data.json"), dataPath);
        } else {
            console.error(`❌ No data.json produced for ${outputPrefix}`);
            return false;
        }

        const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        if (data.length > 0 && data[0].price.includes("10,000")) {
            console.log(`✅ Success: ${outputPrefix} extracted ${data.length} products.`);
            return true;
        } else {
            console.error(`❌ Failure: ${outputPrefix} extracted 0 valid products.`);
            return false;
        }

    } catch (e) {
        console.error(`❌ Error executing extractor for ${outputPrefix}:`, e.message);
        return false;
    }
}

// Build first
console.log("Building project...");
try {
    execSync("npm run build", { stdio: 'inherit' });
} catch (e) {
    console.error("Build failed.");
    process.exit(1);
}

// Execute Tests
const utf8Result = runExtractor(MOCK_UTF8, "utf8");
const sjisResult = runExtractor(MOCK_SJIS, "sjis");

if (utf8Result && sjisResult) {
    console.log("\n🎉 All encoding robustness tests PASSED!");
    process.exit(0);
} else {
    console.error("\n💥 Some tests FAILED.");
    process.exit(1);
}
