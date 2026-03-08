# CVE Mitigation Log

Last scanned: 2025-07-19

Tooling used: `npm audit`, `snyk test --all-projects`, `snyk code test`

---

## Summary

| Category | High | Medium | Low | Status |
|---|---|---|---|---|
| Dependency vulnerabilities (`snyk test`) | 0 | 2 | 1 | Open |
| Source code issues (`snyk code test`) | 2 | 11 | 8 | 2 HIGH + 11 MEDIUM fixed; 8 LOW open |
| Dependency vulnerabilities (`npm audit fix`) | 2 | 0 | 0 | Fixed |

---

## Fixed Issues

### npm audit fix (auto-resolved)

**tar <= 7.5.9 (HIGH)** resolved by upgrading to patched version. This addressed GHSA-83g3-92jg-28cx (Arbitrary File Read/Write via Hardlink) and GHSA-qffp-2rhf-9h96 (Hardlink Path Traversal).

**minimatch (HIGH)** resolved by upgrading to patched version.

### GHSA-23c5-xmqv-rm74 — minimatch ReDoS (detected 2025-07-19, during subscription tiers deployment)

Severity: High (CVSS 7.5). CWE-1333 (Inefficient Regular Expression Complexity).
Package: `minimatch < 3.1.4`.
Vector: Nested `*()` extglob patterns generate catastrophically backtracking regular expressions, enabling a remote denial-of-service via crafted input.
Fix: `npm audit fix` on the EC2 server upgraded minimatch to a patched version. `npm audit` confirmed 0 vulnerabilities after fix.
Status: **Fixed.**

---

## Open Issues -- Dependency Vulnerabilities (Snyk)

### SNYK-JS-DOMPURIFY-8722251 / SNYK-JS-DOMPURIFY-15371386

Severity: Low / Medium (XSS in DOMPurify).
Package: `dompurify@2.5.9` via `react-admin@4.16.20 > ra-ui-materialui > dompurify`.
Location: `admin/package.json`.
Fix: Upgrade `react-admin` from 4.16.20 to 5.x. This is a breaking major version change and requires migration work.
Status: **Open -- requires manual upgrade with breaking changes.**

### SNYK-JS-INFLIGHT-6095116

Severity: Medium (Missing Release of Resource after Effective Lifetime).
Package: `inflight@1.0.6`, transitive dependency of `glob@7.2.3`.
Locations: `admin/package.json` (via react-admin > react-query > broadcast-channel > rimraf > glob) and `mobile/package.json` (via react-native > @react-native/codegen > glob).
Fix: For mobile, upgrade `react-native` from 0.81.5 to 0.84.0. For admin, upgrade `react-admin` to 5.x.
Status: **Open -- requires major version upgrades.**

---

## Open Issues -- Source Code (Snyk Code / SAST)

### HIGH: SQL Injection in admin.controller.js (line 870)

Finding ID: `58aa66cb-57ca-4ebb-ba25-33ef638b730b`

The `updateSentence` handler was building SQL column names dynamically from `Object.keys(req.body)`, interpolating user-controlled field names directly into the query string. While the values were parameterized, the column names were not.

**Fix applied:** Added an `ALLOWED_FIELDS` allowlist based on the `sentence_templates` schema. Only fields matching the allowlist are included in the dynamic query. Requests with no valid fields return a 400 error.

```js
const ALLOWED_FIELDS = [
  'language', 'cefr_level', 'sentence', 'answer',
  'answer_word_id', 'distractors', 'hint',
  'grammar_topic', 'difficulty',
];
const fields = Object.keys(updates).filter(f => ALLOWED_FIELDS.includes(f));
```

Status: **Fixed.**

### HIGH: Hardcoded Secret in authService.js (line 12)

Finding ID: `cda282d4-efbb-4eb3-9940-28d10adedc08`

Snyk flagged `mobile/src/services/authService.js` line 12 for a hardcoded string used as a secret. On inspection, the constants at line 12 are AsyncStorage key names (`'accessToken'`, `'refreshToken'`, `'wordmaster_user'`), which are storage keys, not actual secrets. This may be a false positive, but should be reviewed to confirm no sensitive values are embedded elsewhere in the file.

Status: **Confirmed false positive.** The constants are AsyncStorage key names, not secrets. No change required.

### MEDIUM: Path Traversal (11 findings)

Unsanitized command-line arguments flowed into `fs.readFileSync`, `fs.writeFileSync`, `fs.createWriteStream`, and `fs.unlinkSync` in import/pipeline scripts.

**Fixes applied across all 6 affected files:**

`backend/src/scripts/enhancedFreeDictImporter.js` -- Added `LANG_PAIR_RE` regex (`/^[a-z]{3}-[a-z]{3}$/`) to validate `langPair` input. Added `safeTempPath()` helper that resolves paths and verifies they stay within `__dirname`. The `enhancedImport` function now rejects invalid lang-pair formats before any file I/O.

`backend/src/scripts/importFreeDictData.js` -- Same `LANG_PAIR_RE` and `safeTempPath()` pattern applied. Also validates `--format` against an `ALLOWED_FORMATS` allowlist (`['xdxf', 'tei']`).

`backend/src/scripts/batchLanguageImport.js` -- Added regex validation (`/^[a-z]{2,3}$/`) for individual language codes from `--languages=` before they are combined into lang-pair strings.

`mobile/scripts/pipeline/load.js` -- Added project-root boundary check for `--file` argument (`resolved.startsWith(projectRoot)`). Added regex validation for `--pair` argument.

`mobile/scripts/pipeline/normalize.js` -- Added `/^[a-z]{2,3}$/` validation on `langCode` in `normalizeLanguage()`, plus a `config.languages[langCode]` existence check. Added `path.resolve()` + `startsWith` guard on the output path before `writeFileSync`.

`mobile/scripts/pipeline/validate.js` -- Added `path.resolve()` + `startsWith(DATA_DIR)` guard in `validateFile()`. Added regex validation on `--pair` argument in `parseArgs()`.

Status: **Fixed.**

### LOW: Improper Type Validation (8 findings)

User-controlled values from `req.body` or `req.query` are used with string methods (`.trim()`, `.toUpperCase()`, `.replace()`, `.length`) without first verifying the value is actually a string. An attacker could send an array or object instead of a string, potentially crashing the handler.

Affected controllers: `admin.controller.js`, `auth.controller.js`, `follow.controller.js`, `sentences.controller.js`, `words.controller.js`.

Recommended fix: Add type guards or use `express-validator` (already a project dependency) to enforce types.

```js
const lang = typeof req.query.language === 'string' ? req.query.language.toUpperCase() : '';
```

Status: **Open -- low severity but easy to fix.**

---

## Remaining npm audit Issues (require breaking changes)

Five moderate vulnerabilities remain that `npm audit fix` cannot resolve without breaking changes:

- `dompurify <3.2.4` (XSS, same as Snyk finding above, fix requires `react-admin@5.x`)
- `esbuild <=0.24.2` (dev server request leak, fix requires `vite@7.x`)

These are addressable via `npm audit fix --force`, but that introduces breaking major version upgrades to `react-admin` and `vite`.

---

## Recommended Priority (remaining open items)

1. ~~SQL Injection in admin.controller.js~~ -- **Fixed.**
2. ~~Path traversal in scripts~~ -- **Fixed.**
3. **Type validation in controllers** -- fix soon (LOW, but easy and hardens all endpoints).
4. **DOMPurify / react-admin upgrade** -- plan for next sprint (MEDIUM, breaking change).
5. **inflight / esbuild** -- track upstream; low practical risk.
