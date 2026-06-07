# English-Only Landing-Page Correction Notes

The uploaded implementation plan is written in English and does not request adding a French-language page or language variant. The website must remain English-only.

## Intended requirements from the uploaded plan

The landing page should support the activation strategy by setting expectations before signup: registration is not the primary value event; the product should guide new users toward first facilitated value. The page should communicate that users can quickly experience an AI-facilitated session with low social risk before inviting a real team.

| Requirement area | English-only implementation direction |
|---|---|
| Strategic objective | Position AIFacilitator around reaching first facilitated value, not simply creating an account. |
| Low-risk first experience | Emphasize a two-minute demo or guided first session so users can see value without inviting colleagues immediately. |
| Concrete next action | Make the primary CTA clear and activation-oriented, such as starting a free tester experience or trying an AI-facilitated session. |
| Real session path | Keep a secondary path for users ready to create a real session from a template. |
| Trust and clarity | Explain the product in English with simple benefits: structured conversations, better decisions, summaries, and next actions. |
| Tester/trial copy | Avoid implying manual activation friction; make it clear that testers can try the product immediately after signup where technically supported. |
| Public chrome | Navigation and footer should remain in English. |
| Release discipline | Correct on `dev`, validate locally and on the dev deployment, then promote to `main` only after validation. |

## Correction target

The French landing-page rewrite introduced at commit `266b2aa9bd29feb9ad8769ec72c554ebf97e347e` must be replaced with an English-only version. The previous English/auth baseline is `a053aa3fc78a21a6db21be85daff08018a878c5b`.
