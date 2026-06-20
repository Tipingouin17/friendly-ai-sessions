# Microsoft UET Diagnostic Findings

## Microsoft Ads account page access

The Microsoft Advertising recommendation URL redirected to the public Microsoft Advertising sign-in page with `msg=sessionexpired`, so the exact in-account recommendation details were not visible in this browser session. The preserved recommendation context is an inactive-UET opportunity for account/customer identifiers from the URL: `aid=187263203`, `cid=254879461`, `uid=193081044`, and `opportunityId=5805139923188204668`.

## Microsoft documentation baseline

Microsoft's own UET setup documentation states that a UET tag should be present on website pages and that the key browser request is to `bat.bing.com/action/0?ti=...`. It defines **Tag inactive** as: Microsoft Advertising has not received any user activity data from the UET tag in the last 24 hours, and instructs advertisers to make sure the UET tracking code is still on the website and validate with UET Tag Helper.

The Microsoft consent-mode guidance states that UET Consent Mode uses `ad_storage` with `granted` or `denied`, and recommends setting a default consent configuration on all webpages and dynamically updating it when users provide consent. This supports loading UET in consent mode with `ad_storage: denied` before consent, then updating to `granted` only after advertising consent.

## Production behavior observed

| Scenario | Result | Interpretation |
|---|---|---|
| Returning browser with stored advertising consent | `bat.bing.com/bat.js` was loaded, `#aifacilitator-uet-config` existed, and `window.uetq` contained queued entries. | UET can fire once a visitor has already accepted advertising cookies. |
| Clean first visit with no consent decision | `window.uetq` existed only from the inline default-denied snippet, but `bat.bing.com/bat.js` and `#aifacilitator-uet-config` were absent. | Microsoft may see no UET activity for first-time visits or low-consent traffic, which is consistent with the inactive-tag warning. |

## Root cause

The production code currently gates the entire Microsoft UET loader behind stored advertising consent. The page has a correct default-denied UET consent snippet, but the actual UET script is not loaded until the visitor accepts advertising cookies. That means Microsoft does not receive even a consent-mode, default-denied page signal for visitors who have not yet accepted.

## Safe fix direction

The safe fix is to load Microsoft UET on allowed marketing pages with `ad_storage: denied` by default, then update UET to `ad_storage: granted` only when the visitor grants advertising consent. This should preserve privacy behavior while allowing Microsoft to receive UET activity and diagnose the tag as present. Sensitive product/session/admin paths remain excluded by the existing `UET_DISABLED_PATHS` guard.

## References

[1]: https://help.ads.microsoft.com/apex/index/3/en/56913 "Everything you need to know about setting up UET"
[2]: https://learn.microsoft.com/en-ie/answers/questions/2289656/microsoft-consent-mode "Microsoft Consent Mode"
