# LOONA KakaoTalk Channel

## Channel name

LOONA | 주기 기록

## Search ID suggestions

- `loona_cycle`
- `loona_kr`

Availability must be checked in KakaoTalk Channel Manager.

## Short introduction

간편하고 안전한 여성 주기 기록 서비스 🌙

## Full channel description

LOONA는 생리 주기를 간편하고 안전하게 기록할 수 있도록 도와주는 개인 주기 관리 서비스입니다.

주기 시작일과 종료일을 기록하고 다음 생리일, 배란일과 가임기를 참고용으로 확인할 수 있습니다. 사용자가 입력한 데이터는 LOONA 기능 제공을 위해서만 사용됩니다.

예측 정보는 의료 진단, 피임 방법 또는 의학적 조언을 대신하지 않습니다.

## Welcome message

안녕하세요, LOONA예요 🌙

주기를 편안하고 안전하게 기록할 수 있도록 도와드려요.

아래 버튼을 눌러 시작해 보세요. 예측은 참고용이며 의료 조언이 아닙니다.

## Implemented Kakao MVP

The `/kakao/skill` endpoint currently supports:

- first-use sensitive health-data consent;
- starting and ending a period with today's date;
- starting and ending a period with a supplied past date;
- cycle prediction;
- default cycle and period-length settings;
- privacy information and a published-policy link;
- two-step permanent account and health-data deletion;
- Korean quick replies on every main response.
- partner codes that work across Kakao and Telegram, with read-only partner access;
- privacy-safe growth analytics that reports owners and partners separately.

Proactive KakaoTalk reminders are **not** part of this Skill endpoint. They require
a separate approved Kakao messaging product such as AlimTalk and must not be
advertised until that integration has been implemented and approved.

## Open Builder blocks

Create the following blocks and connect all of them to the same Skill:

| Block | User utterance / action | Parameter |
| --- | --- | --- |
| Welcome | 시작, 처음, 안녕 | none |
| Help | 도움말 | none |
| Start cycle today | 주기 시작 | none |
| Start cycle on date | 주기 시작 + date | `date` (`sys.date`) |
| End period today | 생리 종료 | none |
| End period on date | 생리 종료 + date | `date` (`sys.date`) |
| Forecast | 내 주기 | none |
| Settings | 설정 | none |
| Cycle length | 주기 28일, 주기 30일 | none |
| Period length | 생리 5일, 생리 7일 | none |
| Privacy | 개인정보 | none |
| Sensitive-data consent | 민감정보 처리 동의 | none |
| Request deletion | 내 데이터 삭제 | none |
| Confirm deletion | 데이터 완전 삭제 | none |
| Partner menu | 파트너 | none |
| Own profile code | 파트너: 내 프로필 | none |
| Connect partner | 파트너: 연결 | none |
| Enter partner code | 파트너 코드 ABC123 | none |

For the two date blocks, name the Skill parameter exactly `date`. The backend
also accepts `cycle_date`, `period_date`, or `sys_date`, but using one documented
name keeps the Open Builder configuration easier to audit.

The Railway service needs a public domain. Create a random 32-byte-or-longer
`KAKAO_WEBHOOK_SECRET` in Railway and register the HTTPS URL in Kakao Chatbot
Admin Center. Add the secret through the Skill header settings so it does not
appear in URL or access logs:

```text
URL: https://<domain>/kakao/skill
Header: X-LOONA-Webhook-Secret: <KAKAO_WEBHOOK_SECRET>
```

Requests without the matching token return HTTP 401 before any user data is
looked up or changed. Do not put this URL in public documentation or screenshots.

Set the following production environment variable:

```text
PRIVACY_POLICY_URL=https://<stable-public-domain>/privacy
```

The URL must point to the completed Korean privacy policy, not the draft with
`[TO COMPLETE]` placeholders.

## Local verification

Run the offline scenario and HTTP contract tests:

```bash
npm run test:kakao
```

After deployment, verify the public endpoints:

```bash
curl https://<domain>/health
curl -X POST https://<domain>/kakao/skill \
  -H "X-LOONA-Webhook-Secret: $KAKAO_WEBHOOK_SECRET" \
  -H 'content-type: application/json' \
  -d '{"userRequest":{"utterance":"시작","user":{"id":"manual-test-user"}}}'
```

Do not use a real Kakao user identifier in documentation, screenshots, or bug
reports.

## Before publishing

- Complete and review every placeholder in `docs/privacy-policy-draft.md`.
- Publish the privacy policy at a stable HTTPS URL and set `PRIVACY_POLICY_URL`.
- Fill in the operator name/contact and Supabase processing country.
- Add explicit consent for cycle data before the first saved entry.
- Set the intended audience to 14+ unless parental consent is implemented.
- Confirm the Kakao development-channel user ID remains stable across requests.
- Test start/end with today, a past date, an invalid date, and a future date.
- Test settings and permanent deletion against a non-production test account.
- Confirm prediction responses fit Kakao's response limits in the Open Builder test console.
- Test every block in the development channel before connecting the operating channel.
- Run `/analytics` from the admin Telegram account and confirm Kakao owners and partners are separated.
- Complete the checklist in `docs/kakao-ad-launch-kit.md` before funding a campaign.
