/**
 * @file config.test.ts
 * @description
 * config.json と config.schema.json のスキーマ妥当性検証テスト。
 * Ajv を使用して、設定ファイルの構造、必須フィールド、型、URI フォーマット、
 * および無効な設定値に対するバリデーションエラーを検証する。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { getExtractor } from "../src/extractor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("config.json Schema Validation", () => {
  const rootDir = path.resolve(__dirname, "..");
  const schemaPath = path.join(rootDir, "config.schema.json");
  const configPath = path.join(rootDir, "config.json");

  let ajv: Ajv;
  let schema: Record<string, unknown>;
  let config: Record<string, unknown>;

  beforeAll(() => {
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    schema = JSON.parse(schemaContent);

    const configContent = fs.readFileSync(configPath, "utf-8");
    config = JSON.parse(configContent);
  });

  test("config.schema.json は有効な JSON Schema Draft-07 である", () => {
    expect(schema).toBeDefined();
    expect(schema["$schema"]).toBe("http://json-schema.org/draft-07/schema#");
    expect(ajv.validateSchema(schema)).toBe(true);
  });

  test("リポジトリの config.json は config.schema.json に完全に適合する", () => {
    const validate = ajv.compile(schema);
    const valid = validate(config);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  test("config.json に定義された各 extractor_type は getExtractor でサポートされている", () => {
    const targets = config["targets"] as Array<{ extractor_type: string }>;
    expect(Array.isArray(targets)).toBe(true);
    expect(targets.length).toBeGreaterThan(0);

    for (const target of targets) {
      const extractor = getExtractor(target.extractor_type);
      expect(extractor).not.toBeNull();
    }
  });

  describe("不正な設定に対するバリデーションエラーの検出", () => {
    let validate: ReturnType<Ajv["compile"]>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    test("URL が欠落している場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            name: "missing_url_target",
            selector: "",
            extractor_type: "dell-outlet",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(
        validate.errors?.some((e) => e.message?.includes("must have required property 'url'")),
      ).toBe(true);
    });

    test("name が欠落している場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            url: "https://example.com/products",
            selector: "",
            extractor_type: "dell-outlet",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(
        validate.errors?.some((e) => e.message?.includes("must have required property 'name'")),
      ).toBe(true);
    });

    test("name が空文字の場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            name: "",
            url: "https://example.com/products",
            selector: "",
            extractor_type: "dell-outlet",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(validate.errors?.some((e) => e.params && "limit" in e.params)).toBe(true);
    });

    test("selector が欠落している場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            name: "test_target",
            url: "https://example.com/products",
            extractor_type: "dell-outlet",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(
        validate.errors?.some((e) => e.message?.includes("must have required property 'selector'")),
      ).toBe(true);
    });

    test("extractor_type が欠落している場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            name: "test_target",
            url: "https://example.com/products",
            selector: "",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(
        validate.errors?.some((e) =>
          e.message?.includes("must have required property 'extractor_type'"),
        ),
      ).toBe(true);
    });

    test("無効な URL フォーマットの場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            name: "invalid_url_target",
            url: "not-a-valid-uri",
            selector: "",
            extractor_type: "dell-outlet",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(validate.errors?.some((e) => e.keyword === "format")).toBe(true);
    });

    test("未定義の extractor_type の場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: [
          {
            name: "unknown_extractor_target",
            url: "https://example.com/products",
            selector: "",
            extractor_type: "unsupported-site",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(validate.errors?.some((e) => e.keyword === "enum")).toBe(true);
    });

    test("未定義のプロパティが含まれる場合はバリデーションエラーとなる (additionalProperties: false)", () => {
      const invalidConfig = {
        targets: [
          {
            name: "extra_prop_target",
            url: "https://example.com/products",
            selector: "",
            extractor_type: "dell-outlet",
            extra_field: "unexpected",
          },
        ],
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(validate.errors?.some((e) => e.keyword === "additionalProperties")).toBe(true);
    });

    test("targets が配列でない場合はバリデーションエラーとなる", () => {
      const invalidConfig = {
        targets: "not-an-array",
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(validate.errors?.some((e) => e.keyword === "type")).toBe(true);
    });

    test("targets プロパティ自体が存在しない場合はバリデーションエラーとなる", () => {
      const invalidConfig = {};
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
      expect(
        validate.errors?.some((e) => e.message?.includes("must have required property 'targets'")),
      ).toBe(true);
    });
  });
});
