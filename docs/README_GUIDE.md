# README Maintenance Guide

Ensures README accuracy across all packages when features change.

## When to Update READMEs

Update the relevant README whenever any of the following occurs:

- [ ] New export added to a package's `src/index.ts`
- [ ] API signature changed (parameters, return type, options)
- [ ] New package created or existing package removed
- [ ] Requirements changed (min RN version, iOS/Android version, Expo SDK)
- [ ] Features added, removed, or significantly changed
- [ ] Dependencies between packages changed
- [ ] Code examples become outdated due to API changes

## README Structure Standard

Every package README must follow this template:

```markdown
# @webbridge-native/<package-name>

One-line description of the package.

## Why

2-3 sentences explaining what gap this fills and why it matters.

## Installation

Install command with required peer dependencies.

## Usage

Code examples showing primary use cases.

## API Reference

| Export | Type | Description |
|---|---|---|
| `ExportName` | Class/Function/Type | Brief description |

## License

MIT
```

### Notes

- Keep the "Why" section focused on the browser gap being filled.
- Usage examples should be copy-pasteable and use correct import paths.
- API Reference table must list every public export from `src/index.ts`.

## Verification Checklist

Run through this checklist before any release:

- [ ] Every export in `src/index.ts` is documented in the README API table
- [ ] All code examples use correct import paths (`@webbridge-native/<pkg>`)
- [ ] Method signatures (parameters, return types) match source code
- [ ] Requirements section matches the root README
- [ ] No Korean text in any README (all READMEs are English-only)
- [ ] Package `description` in `package.json` matches the README one-liner
- [ ] Options tables list all available options with correct defaults

### Quick Verification Script

```bash
# For each package, compare exports vs README mentions
for pkg in packages/*/; do
  echo "=== $(basename $pkg) ==="
  # List exports from index.ts
  grep -E "^export" "$pkg/src/index.ts" 2>/dev/null | head -20
  echo "---"
done
```

## Root README Sync Rules

The root `README.md` is the public entry point. Keep it in sync:

1. **Package table** -- must list all packages in `packages/`. When a package is added or removed, update the table.
2. **Requirements section** -- single source of truth for minimum versions (RN, iOS, Android, Expo). All package READMEs must reference these same versions.
3. **Architecture diagram** -- must reflect the current layer structure. Update when layers or packages change.
4. **Quick Start examples** -- must use real, tested code with correct API signatures.
5. **Battle-Tested section** -- update numbers when new test scenarios are added.

### Cross-Reference Rule

When updating a version requirement in the root README, search all package READMEs for the old version string and update them too:

```bash
grep -r "React Native 0\." packages/*/README.md
grep -r "iOS 1[0-9]\." packages/*/README.md
```
