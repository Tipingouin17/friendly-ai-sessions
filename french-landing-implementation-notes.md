# French landing-page implementation mapping

The uploaded implementation plan reframes AIFacilitator around **first facilitated value**, not mere registration. For the French-first landing-page pass, the public home page should therefore position the product around a low-risk first experience, clear post-signup activation, and fast access to a useful AI-facilitated session.

| Plan requirement | Landing-page implementation decision |
|---|---|
| Make the first action obvious. | Use a French hero CTA focused on trying a first AI-facilitated workshop/session rather than generic registration. |
| Lower emotional risk before social commitment. | Emphasize a solo-safe two-minute demo and template-based first session in the hero/supporting copy. |
| Avoid manual activation blocking first value. | Keep the tester offer but describe it as an extended trial benefit, not a blocker before trying the product. |
| Route users toward activation. | Keep unauthenticated CTAs to `/signup`; authenticated CTAs continue to `/my-facilitators`. |
| Support conversion testing and SEO. | Localize home-page title, description, FAQ schema, software schema, hero fallback HTML, and below-fold content in French. |
| Preserve release discipline. | Implement only on `dev`, validate locally, then push and test the dev deployment before production promotion. |

The implementation will update the existing root landing page in French first, because the user explicitly prioritized French. It will avoid changing backend data, payment logic, authentication behavior, or unrelated public pages in this pass.
