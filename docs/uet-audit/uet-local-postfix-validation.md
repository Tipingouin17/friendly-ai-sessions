# Microsoft UET Local Post-Fix Validation

Date: 2026-06-20
Branch: `dev`

## Finding

The initial React-only change was not sufficient for Microsoft Advertising verification because the production/SEO HTML shell can be evaluated before the React tracking initializer inserts the UET bootstrap. The safer fix is to include the Microsoft UET base bootstrap directly in `index.html`, immediately after the default-denied Microsoft Consent Mode declaration.

## Privacy posture

The static UET bootstrap is loaded with Microsoft Consent Mode set to `ad_storage: denied` before any cookie-consent decision. The application still updates Microsoft consent to granted only after the visitor grants advertising consent through the cookie banner.

## Local preview evidence

Local rebuilt preview URL tested: `http://localhost:4173/?msclkid=local-uet-static-bootstrap-test`.

The browser runtime inspection returned:

| Check | Result |
|---|---:|
| Stored cookie consent before inspection | `null` |
| `#aifacilitator-uet-config` present | `true` |
| `#microsoft-uet-script` present | `true` |
| `bat.bing.com/bat.js` resource requested | `true` |
| `window.uetq` present | `object` |
| UET queue length before consent | `3` |

This confirms Microsoft can now see the UET tag on first page load while optional advertising storage remains denied until consent.
