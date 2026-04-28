# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report via GitHub Security Advisories:
https://github.com/kaeuhy/webbridge-native/security/advisories/new

### Response Timeline

- **48 hours**: Initial acknowledgment
- **7 days**: Severity assessment
- **90 days**: Public disclosure (or coordinated earlier)

## Security Practices

- **Zero telemetry**: This library makes no external network calls
- **No eval**: No `eval()`, `new Function()`, or `setTimeout(string)` in source
- **No Math.random in security contexts**: All IDs use timestamp + counter
- **Secure by default**: SameSite=Lax, Secure cookie enforcement, cross-origin credential stripping
- **npm provenance**: All published packages include build attestation
- **MIT licensed**: All dependencies are MIT/Apache-2.0/BSD compatible

## Known Security Boundaries

1. **Header injection**: Our library passes headers as `Record<string, string>` to native fetch. CRLF injection prevention is handled by the native networking layer (NSURLSession/OkHttp).
2. **Certificate pinning**: Not provided. Use a dedicated library (`react-native-ssl-pinning`). We do not interfere with pinning libraries.
3. **SSRF**: URL validation is the application's responsibility. Our library does not modify user-provided URLs.
4. **Mock handler isolation**: Mock handlers run in the same JS context. A malicious handler could access the same globals. This is acceptable for dev-only mocking.
