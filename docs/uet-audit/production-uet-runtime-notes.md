# Production UET Runtime Notes

During production runtime inspection at `https://aifacilitator.ai/?msclkid=uet-audit-test`, the browser session initially had stored cookie consent from a previous visit:

```json
{"advertising":true,"analytics":true,"timestamp":"2026-06-07T13:03:50.895Z","version":1}
```

With advertising consent present, production loaded `https://bat.bing.com/bat.js`, inserted the inline script `#aifacilitator-uet-config`, and `window.uetq` existed with queued entries. This confirms that the current implementation can fire UET for returning users who already accepted advertising cookies.

The diagnostic then cleared `cookie_consent_v1` and `aifacilitator_acquisition_attribution_v1` and navigated to `https://aifacilitator.ai/?msclkid=uet-audit-clean` to simulate a first visit without a consent decision. Further inspection is required on the clean state.
