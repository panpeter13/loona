# LOONA Kakao advertising launch kit

## Launch decision

Do not optimize for channel friends alone. The primary conversion is an owner
who completes onboarding and records a first cycle. Partner profiles are
reported separately and must not be counted as customers.

## Funnel

1. Kakao Moment impression and click.
2. Kakao channel friend added.
3. LOONA chatbot opened (`signup`).
4. Language selected (`onboarding_completed`).
5. First cycle recorded (`first_cycle_recorded`).
6. Active again within 7 and 30 days.
7. Plus subscription purchased (after payments are implemented).

The Telegram admin command `/analytics` reports Kakao owners, activated owners,
7-day active users, partners and Plus users separately.

## Campaign structure

Initial test duration: 14 days. Suggested starting media budget: 300,000 KRW,
excluding Railway and creative production.

| Campaign | Creative | Budget share | Purpose |
| --- | --- | ---: | --- |
| `kr_cycle_care_a` | `creative-a-cycle-care-v2.png` | 45% | Gentle cycle tracking |
| `kr_privacy_b` | `creative-b-privacy-v2.png` | 45% | Privacy and reassurance |
| Reserve | Winning creative | 10% | Scale after day 5 |

Target: South Korea, women 20–39. Begin broadly; do not target or infer health
conditions, pregnancy, fertility problems or cycle status.

## Approved copy

### A — gentle tracking

- Headline: `LOONA 베타 테스트에 참여해 주세요`
- Asset title: `복잡하지 않은 주기 기록`
- Body: `복잡하지 않게 주기를 기록하는 LOONA를 테스트하고 솔직한 의견을 들려주세요. 현재 베타 버전이며 기능이 변경되거나 오류가 있을 수 있어요.`
- CTA: `무료로 테스트하기`

### B — privacy

- Headline: `함께 만드는 LOONA 베타`
- Asset title: `필요한 정보만 안전하게 관리해요`
- Body: `주기 기록에 필요한 정보만 사용하고 원할 때 직접 삭제할 수 있어요. 아직 테스트 중인 서비스에 참여하고 개선 의견을 보내주세요.`
- CTA: `베타 테스트 참여하기`

The main headline and asset title must remain different. Use two separate
single-image creatives rather than a carousel with duplicated slide assets.

## Destination

Use the production HTTPS URL ending in `/kakao`. The page explains the beta,
features, data handling and medical disclaimer, and links to the public LOONA
Kakao channel at `https://pf.kakao.com/_xfltxnX/chat`.

Required disclaimer on the destination/profile: `예측은 참고용이며 의료 조언이 아닙니다.`
The ad and destination must keep the beta disclosure visible; do not present the
service as a finished medical product.

## Attribution

When the Kakao campaign can pass a Skill parameter, send:

- `source=kakao_moment`
- `campaign=kr_cycle_care_a` or `campaign=kr_privacy_b`

For a message/deep-link utterance, LOONA also accepts `시작 ad_kr_cycle_care_a`
and `시작 ad_kr_privacy_b`. No health data is stored in attribution fields.

## Go-live checklist

- [ ] Kakao business information verified; the unverified-business warning is gone.
- [ ] Channel name, description, profile image and welcome message are Korean-first.
- [ ] Privacy policy opens over HTTPS and identifies the operator and processor region.
- [ ] Open Builder blocks include language, news and partner flows.
- [ ] A clean Kakao account completes onboarding and records/deletes test data.
- [ ] `/analytics` works and owners/partners are reported separately.
- [ ] Both ads pass Kakao review; no medical-accuracy or contraception claims.
- [ ] Daily cap and total 14-day cap are configured.
- [ ] Stop rules are agreed before launch.

## Operating rules

Review performance on days 3, 5, 7 and 14. Do not optimize from clicks alone.
Pause a creative if it receives meaningful traffic but produces no completed
onboarding, or if first-cycle activation is materially below the other variant.
Never sell cycle data or use it to create advertising audiences.
