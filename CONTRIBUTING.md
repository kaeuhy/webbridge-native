# Contributing to WebBridge Native

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/kaeuhy/webbridge-native.git
cd webbridge-native
pnpm install
pnpm verify
```

## Branch Strategy

- **`main`**: Release only. No direct commits.
- **`develop`**: Daily work. All PRs target this branch.
- **Feature branches**: `feat/<name>`, `fix/<name>` from `develop`.

## Workflow

1. Fork and create a branch from `develop`
2. Write failing tests first
3. Implement the feature/fix
4. Run `pnpm verify` — must pass
5. Commit with [Conventional Commits](https://www.conventionalcommits.org/)
6. Open a PR to `develop`

## Commit Messages

```
feat(cookies): add SameSite=None enforcement
fix(cache): handle Vary: * as uncacheable
docs: update migration guide
test(redirect): add cross-origin header strip test
```

## Code Style

- TypeScript strict mode, no `any`
- Functions under 50 lines
- JSDoc on all public APIs
- No external dependencies without approval

## Testing

- Unit tests: `packages/<name>/src/*.test.ts`
- Integration tests: `packages/preset/src/integration.test.ts`
- Validation scenarios: `harness/validation/scenarios/`

Every PR must maintain 100% test pass rate.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
