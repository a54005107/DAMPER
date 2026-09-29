# Security and Git Rules

이 문서는 DAMPER 재고관리 웹 프로젝트를 GitHub에 올릴 때 지켜야 하는 보안 및 Git 관리 규칙입니다. 프로젝트 구조는 하나의 저장소 안에 React 프론트엔드(`client`)와 Spring Boot 서버(`server`)를 함께 두는 기준으로 작성합니다.

## 절대 올리면 안 되는 데이터

다음 데이터는 GitHub 공개/비공개 여부와 관계없이 커밋하지 않습니다.

- 실제 비밀번호, API 키, 토큰, OAuth secret, JWT secret
- DB 접속 정보: 운영/개발 DB 주소, 계정, 비밀번호, 포트, 스키마명 중 민감한 값
- 클라우드 자격 증명: AWS/GCP/Azure access key, service account JSON, SSH private key
- 운영 서버 접속 정보: 서버 IP, SSH 계정, pem/key 파일, 배포 계정 비밀번호
- 실제 고객/거래처/직원 개인정보: 이름, 전화번호, 이메일, 주소, 계좌, 사업자 정보
- 실제 재고/매출/발주/입출고 데이터 원본
- 운영 로그, 에러 덤프, DB dump, 백업 파일
- 세션/쿠키/브라우저 저장소 덤프
- 로컬 개발자 개인 설정 파일

## 환경변수 관리

- 실제 값은 `.env`, `.env.local`, `.env.development`, `.env.production` 같은 로컬 환경 파일에만 둡니다.
- `.env`와 `.env.*`는 `.gitignore`로 제외합니다.
- 공유가 필요한 변수 이름은 `.env.example`에 샘플 값 또는 빈 값으로 작성합니다.
- `.env.example`에는 실제 비밀번호나 실제 접속 주소를 넣지 않습니다.

예시:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=damper_inventory
DB_USER=example_user
DB_PASSWORD=change_me
JWT_SECRET=change_me
```

## Git에 올려야 하는 파일

다음 파일은 프로젝트 재현과 협업에 필요하므로 커밋 대상입니다.

- 프론트엔드/서버 소스 코드
- `package.json`
- 패키지 잠금 파일: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- Gradle 빌드/설정 파일: `build.gradle`, `build.gradle.kts`, `settings.gradle`, `settings.gradle.kts`
- Gradle Wrapper: `gradlew`, `gradlew.bat`
- Gradle Wrapper 파일: `gradle/wrapper/gradle-wrapper.jar`, `gradle/wrapper/gradle-wrapper.properties`
- 비밀값이 없는 `application.yml`, `application.properties`
- Docker Compose 설정 파일
- Flyway migration SQL
- `.env.example`
- 팀에서 공유하기로 한 IDE 설정

주의: `.gradle/`은 로컬 Gradle 캐시라 제외하지만, `gradle/` 폴더는 Gradle Wrapper를 담으므로 제외하면 안 됩니다.

## Git에 올리지 않는 생성물

다음 파일은 빌드나 설치 과정에서 다시 만들 수 있으므로 커밋하지 않습니다.

- `node_modules/`
- `client/dist/`
- `client/build/`
- `.vite/`, `client/.vite/`
- `*.tsbuildinfo`
- `server/**/.gradle/`
- `server/**/build/`
- `server/**/out/`
- `.npm-cache/`
- `*.log`, `logs/`

## 재고관리 데이터 규칙

- 실제 재고 엑셀, 매출 자료, 거래처 목록은 커밋하지 않습니다.
- 테스트가 필요하면 실제 데이터가 아닌 샘플 데이터를 만듭니다.
- 샘플 데이터는 실제 업체명, 전화번호, 이메일, 주소를 사용하지 않습니다.
- DB seed 파일이나 Flyway SQL에 실제 운영 데이터를 넣지 않습니다.
- 화면 캡처를 올릴 때도 개인정보, 단가, 매입처, 거래처명이 노출되지 않는지 확인합니다.

## Spring Boot 설정 규칙

- `application.yml`에는 기본 구조와 로컬 기본값만 둡니다.
- 민감한 값은 환경변수로 주입합니다.
- 운영 DB 접속 정보는 Git에 두지 않습니다.
- 프로필별 설정 파일을 커밋할 때는 실제 운영 secret이 없는지 확인합니다.
- 로깅 설정에서 request header, cookie, authorization token을 출력하지 않도록 주의합니다.

예시:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/damper_inventory}
    username: ${DB_USER:example_user}
    password: ${DB_PASSWORD:change_me}
```

## React 설정 규칙

- 프론트엔드 환경변수도 실제 값은 `.env.*`에 둡니다.
- 브라우저에 노출되는 값은 비밀값으로 취급할 수 없습니다.
- `VITE_` 접두사가 붙은 값은 빌드 결과에 포함될 수 있으므로 API secret을 넣지 않습니다.
- 운영 API 주소가 내부망 정보라면 공개 저장소에 직접 쓰지 않습니다.

## Docker Compose 규칙

- 개발용 `docker-compose.yml`은 커밋할 수 있습니다.
- 실제 비밀번호는 Compose 파일에 직접 쓰지 말고 환경변수로 분리합니다.
- 운영용 Compose 파일을 커밋해야 한다면 secret 값이 빠져 있는 템플릿 형태로 둡니다.
- 볼륨에 저장된 DB 데이터나 백업 파일은 커밋하지 않습니다.

## IDE 설정 규칙

- 팀 공통 코드 스타일, inspection, run configuration은 공유할 수 있습니다.
- 개인 작업공간 파일은 공유하지 않습니다.
- JetBrains 기준으로 `workspace.xml`, `tasks.xml`, `shelf/`, `usage.statistics.xml`은 개인 설정입니다.
- 새 IDE 파일을 커밋하기 전 팀 공통 설정인지 개인 설정인지 확인합니다.

## 커밋 전 점검

커밋 전에 다음 명령으로 민감 데이터와 대량 생성물이 섞였는지 확인합니다.

```bash
git status --short
git diff --cached --name-only
git check-ignore -v --no-index client/node_modules/typescript/package.json
git ls-files -- client/node_modules
```

확인 기준:

- `node_modules/`, `dist/`, `build/`, `.gradle/` 파일이 변경 목록에 없어야 합니다.
- `.env`나 `.env.production` 같은 실제 환경 파일이 없어야 합니다.
- `.env.example`은 커밋할 수 있지만 실제 값이 없어야 합니다.
- `git ls-files -- client/node_modules`가 아무것도 출력하지 않아야 합니다.

## 실수로 민감 정보를 올렸을 때

민감 정보가 커밋되었다면 파일 삭제만으로 끝내면 안 됩니다.

1. 노출된 비밀번호, 토큰, 키를 즉시 폐기하고 새로 발급합니다.
2. 해당 값을 사용하는 서버, DB, 외부 서비스 설정을 교체합니다.
3. Git 이력에서 제거가 필요한지 판단합니다.
4. 이미 원격 저장소에 push했다면 팀원에게 알리고 저장소 이력 정리 절차를 합의합니다.

민감 정보는 Git 이력에 남아 있을 수 있으므로 "파일을 지웠으니 안전하다"고 판단하지 않습니다.

## PR 리뷰 체크리스트

- 대량 생성물이나 설치 라이브러리가 포함되지 않았는가
- 실제 계정, 비밀번호, 토큰, 운영 URL이 포함되지 않았는가
- 실제 재고/거래처/매출 데이터가 포함되지 않았는가
- `.env.example`에는 변수 이름과 샘플 값만 있는가
- `gradle/`과 `.gradle/`을 혼동하지 않았는가
- Docker Compose 파일에 실제 secret이 직접 들어가지 않았는가
- 로그 출력에 개인정보나 인증 정보가 남지 않는가
