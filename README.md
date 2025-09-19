# 🤖 KakaoTalk OpenChat Bot

Multi-room Level & Point System Bot for KakaoTalk OpenChat

카카오톡 오픈채팅방을 위한 다방 지원 레벨링 및 포인트 시스템 봇입니다. 방별 독립적인 데이터 관리와 자동 MVP 발표 기능을 제공합니다.

## 🏆 Core System

- Multi-room Support: 방별 독립적인 데이터 관리
- Level & Experience System: 채팅 참여도 기반 레벨링
- Point Economy: 포인트 획득, 사용, 양도 시스템
- Daily Statistics: 일별 활동 통계 및 순위
- Auto MVP Announcement: 오후 8시마다 자동 MVP 발표

## 🎰 Jackpot System

- Random Rewards: 채팅 시 확률적 잭팟 시스템
- Configurable Settings: 확률, 보상, 쿨다운 조정 가능
- Global Configuration: 모든 방 공통 잭팟 설정

## 🛒 Shop System

- Item Store: 포인트로 구매 가능한 아이템들
- Inventory Management: 개인 아이템 소지 현황
- Point Transfer: 유저 간 포인트 양도 기능

## 👑 Admin Panel
 
- User Management: 유저 데이터 관리 및 초기화
- Point/EXP Control: 포인트 및 경험치 직접 지급
- Jackpot Configuration: 실시간 잭팟 설정 조정
- Room Statistics: 방 전체 상태 모니터링

-----

## 📝 Commands

### 🔰 User Commands

| Command | Description 
| --- | --- | 
| !도움말 | Show all available commands | 
| !출석 | Daily check-in (rewards: +10 EXP, +2 Points)  | 
| !랭킹 | Show top 5 users by experience |
| !mvp | Display today's MVP top 10 |
| !상점 | View item shop |
| !구매 [item] | [item] Purchase item from shop |
| !양도 [user] [points] | [user] [points] Transfer points to another user |
| !채팅수 | View chat statistics |

### 👑 Admin Commands

| Command | Description 
| --- | --- | 
| !관리자등록 | Register as first admin | 
| !관리자목록 |List all admins | 
| !관리자추가 | [user] Add new admin |
| !관리자해제 | [user] Remove admin privileges |
| !포인트지급 | [user] [amount] Give points to user |
| !경험치지급 [user] [amount] | Give experience to user |
| !초기화 [user] | Reset user data |
| !경험치지급 | [user] [amount] Give experience to user |
| !관리자 전체초기화 | Reset all user data |
| !잭팟설정 | View jackpot configuration |
| !잭팟 켜기/끄기 | Enable/disable jackpot |
| !잭팟확률 [%] | Set jackpot probability |
| !잭팟보상 [min] [max] | Set jackpot reward range |
| !잭팟쿨다운 [minutes] | Set jackpot cooldown |
| !방상태 | View room statistics |
| !mvp타이머리셋 | Reset MVP timer |



-------
#### Made with kminsuk97
