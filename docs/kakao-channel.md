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

## Initial Open Builder blocks

| Block | User utterance | Skill endpoint |
| --- | --- | --- |
| Welcome | 시작, 처음, 안녕 | `/kakao/skill` |
| Help | 도움말 | `/kakao/skill` |
| Start cycle | 주기 시작 | `/kakao/skill` |
| End period | 생리 종료 | `/kakao/skill` |
| Forecast | 내 주기 | `/kakao/skill` |
| Privacy | 개인정보 | `/kakao/skill` |
| Sensitive-data consent | 민감정보 처리 동의 | `/kakao/skill` |

The Railway service needs a public domain. Register the complete HTTPS URL, for example `https://<domain>/kakao/skill`, as the Skill URL in Kakao Chatbot Admin Center.

## Before publishing

- Publish the privacy policy at a stable HTTPS URL.
- Fill in the operator name/contact and Supabase processing country.
- Add explicit consent for cycle data before the first saved entry.
- Set the intended audience to 14+ unless parental consent is implemented.
- Test every block in the development channel before connecting the operating channel.
