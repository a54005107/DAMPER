# 원본 엑셀 분석

파일: DAMPER재고관리(최종).xlsx. 원본은 변경하지 않았습니다.

9개 시트(8개 날짜별 시트 + 빈 Sheet1). 최신 유효 시트 2026.9.14, A42:N324, 자재 282행, SCR-LP 36종 / ICER 4종. 계획월 2026-10, 133대.

## 초기 적용

J43:J324의 저장된 현재재고를 2026-09-14 종료 스냅샷으로 보존. 웹 거래는 2026-09-15부터 입력. 과거 G/H/I를 다시 차감하지 않습니다. 공용 자재는 한 행을 공유합니다. 모델 연결은 M열 수식의 계수를 추출했습니다. 불일치 행은 검토 대상으로 표시하며 승인 전 자동 사용량 저장을 차단합니다. 계획 필요량은 M열에서 추출한 소요량으로 산출합니다.

## 수식 불일치

- G176 / M176 (Packing Bush): `SUM(H19:H35)*C176` / `SUM(P19:P31)*C176` → SCR 800A(SS): 사용 2, 계획 0; SCR 800A(SB): 사용 2, 계획 0; SCR DIN 800A(SS): 사용 2, 계획 0; SCR DIN 800A(SB): 사용 2, 계획 0
- G200 / M200 (Unit Bearing): `SUM(H19:H35)*C200` / `SUM(P19:P31)*C200` → SCR 800A(SS): 사용 2, 계획 0; SCR 800A(SB): 사용 2, 계획 0; SCR DIN 800A(SS): 사용 2, 계획 0; SCR DIN 800A(SB): 사용 2, 계획 0
- G209 / M209 (Actuator Bracket): `SUM(H4:H28)*C209` / `SUM(P4:P31)*C209` → SCR 750A(SB): 사용 0, 계획 1; SCR DIN 750A(SS): 사용 0, 계획 1; SCR DIN 750A(SB): 사용 0, 계획 1
- G210 / M210 (Actuator Bracket): `SUM(G32)*C210` / `SUM(P32:P35)*C210` → SCR 800A(SS): 사용 0, 계획 1; SCR 800A(SB): 사용 0, 계획 1; SCR DIN 800A(SS): 사용 0, 계획 1; SCR DIN 800A(SB): 사용 0, 계획 1
- G253 / M253 (Shaft): `H7` / `P5*C253` → SCR N450: 사용 0, 계획 1; SCR 450A: 사용 1, 계획 0
- G254 / M254 (Shaft): `H7` / `P5*C254` → SCR N450: 사용 0, 계획 1; SCR 450A: 사용 1, 계획 0
- G285 / M285 (BOLT): `SUM(H4:H18)*16+SUM(H19:H31)*8` / `SUM(P4:P31)*C285` → SCR 650A(SS): 사용 8, 계획 16; SCR 650A(SB): 사용 8, 계획 16; SCR DIN 650A(SS): 사용 8, 계획 16; SCR DIN 650A(SB): 사용 8, 계획 16; SCR 5K 650A: 사용 8, 계획 16; SCR 700A(SS): 사용 8, 계획 16; SCR 700A(SB): 사용 8, 계획 16; SCR DIN 700A(SS): 사용 8, 계획 16; SCR DIN 700A(SB): 사용 8, 계획 16; SCR 750A(SS): 사용 8, 계획 16; SCR 750A(SB): 사용 8, 계획 16; SCR DIN 750A(SS): 사용 8, 계획 16; SCR DIN 750A(SB): 사용 8, 계획 16
- G287 / M287 (BOLT): `SUM(H32:H35)*C287` / `P32*C287` → SCR 800A(SB): 사용 8, 계획 0; SCR DIN 800A(SS): 사용 8, 계획 0; SCR DIN 800A(SB): 사용 8, 계획 0
- G290 / M290 (BOLT): `SUM(H32,J9)*C290` / `SUM(P32:P35,R9)*C290` → SCR 800A(SB): 사용 0, 계획 8; SCR DIN 800A(SS): 사용 0, 계획 8; SCR DIN 800A(SB): 사용 0, 계획 8
- G302 / M302 (BOLT): `J7*F302` / `R7*C302` → ICER 700A: 사용 64, 계획 4
- G306 / M306 (NUT): `SUM(H4:H18)*24+SUM(H19:H31)*16+SUM(H32:H35)*12` / `SUM(P4:P35)*C306` → SCR 650A(SS): 사용 16, 계획 24; SCR 650A(SB): 사용 16, 계획 24; SCR DIN 650A(SS): 사용 16, 계획 24; SCR DIN 650A(SB): 사용 16, 계획 24; SCR 5K 650A: 사용 16, 계획 24; SCR 700A(SS): 사용 16, 계획 24; SCR 700A(SB): 사용 16, 계획 24; SCR DIN 700A(SS): 사용 16, 계획 24; SCR DIN 700A(SB): 사용 16, 계획 24; SCR 750A(SS): 사용 16, 계획 24; SCR 750A(SB): 사용 16, 계획 24; SCR DIN 750A(SS): 사용 16, 계획 24; SCR DIN 750A(SB): 사용 16, 계획 24; SCR 800A(SS): 사용 12, 계획 24; SCR 800A(SB): 사용 12, 계획 24; SCR DIN 800A(SS): 사용 12, 계획 24; SCR DIN 800A(SB): 사용 12, 계획 24
- G307 / M307 (NUT): `SUM(H19:H31)*8+SUM(H32:H35)*16` / `SUM(P19:P32)*C307` → SCR 650A(SS): 사용 8, 계획 16; SCR 650A(SB): 사용 8, 계획 16; SCR DIN 650A(SS): 사용 8, 계획 16; SCR DIN 650A(SB): 사용 8, 계획 16; SCR 5K 650A: 사용 8, 계획 16; SCR 700A(SS): 사용 8, 계획 16; SCR 700A(SB): 사용 8, 계획 16; SCR DIN 700A(SS): 사용 8, 계획 16; SCR DIN 700A(SB): 사용 8, 계획 16; SCR 750A(SS): 사용 8, 계획 16; SCR 750A(SB): 사용 8, 계획 16; SCR DIN 750A(SS): 사용 8, 계획 16; SCR DIN 750A(SB): 사용 8, 계획 16; SCR 800A(SB): 사용 16, 계획 0; SCR DIN 800A(SS): 사용 16, 계획 0; SCR DIN 800A(SB): 사용 16, 계획 0
- G316 / M316 (Spring washer): `SUM(H4:H18)*24+SUM(H19:H31)*16+SUM(H32:H35)*4` / `SUM(P4:P35)*C316` → SCR 650A(SS): 사용 16, 계획 24; SCR 650A(SB): 사용 16, 계획 24; SCR DIN 650A(SS): 사용 16, 계획 24; SCR DIN 650A(SB): 사용 16, 계획 24; SCR 5K 650A: 사용 16, 계획 24; SCR 700A(SS): 사용 16, 계획 24; SCR 700A(SB): 사용 16, 계획 24; SCR DIN 700A(SS): 사용 16, 계획 24; SCR DIN 700A(SB): 사용 16, 계획 24; SCR 750A(SS): 사용 16, 계획 24; SCR 750A(SB): 사용 16, 계획 24; SCR DIN 750A(SS): 사용 16, 계획 24; SCR DIN 750A(SB): 사용 16, 계획 24; SCR 800A(SS): 사용 4, 계획 24; SCR 800A(SB): 사용 4, 계획 24; SCR DIN 800A(SS): 사용 4, 계획 24; SCR DIN 800A(SB): 사용 4, 계획 24
- G317 / M317 (Spring washer): `SUM(H19:H31)*8+SUM(H32:H35)*16` / `SUM(P19:P35)*C317` → SCR 650A(SS): 사용 8, 계획 18; SCR 650A(SB): 사용 8, 계획 18; SCR DIN 650A(SS): 사용 8, 계획 18; SCR DIN 650A(SB): 사용 8, 계획 18; SCR 5K 650A: 사용 8, 계획 18; SCR 700A(SS): 사용 8, 계획 18; SCR 700A(SB): 사용 8, 계획 18; SCR DIN 700A(SS): 사용 8, 계획 18; SCR DIN 700A(SB): 사용 8, 계획 18; SCR 750A(SS): 사용 8, 계획 18; SCR 750A(SB): 사용 8, 계획 18; SCR DIN 750A(SS): 사용 8, 계획 18; SCR DIN 750A(SB): 사용 8, 계획 18; SCR 800A(SS): 사용 16, 계획 18; SCR 800A(SB): 사용 16, 계획 18; SCR DIN 800A(SS): 사용 16, 계획 18; SCR DIN 800A(SB): 사용 16, 계획 18
- G321 / M321 (Nord lock washer): `SUM(J6)*12+SUM(J7)*16+SUM(J8)*16+SUM(J9)*8` / `SUM(R6:R9)*C321` → ICER 600A: 사용 12, 계획 14; ICER 700A: 사용 16, 계획 14; ICER 800A: 사용 16, 계획 14; ICER 1000A: 사용 8, 계획 14

## 누계 및 추가 확인

2026.9.14!L4:L39 및 N6:N9의 수식이 직전 2026.9.11 대신 2026.9.10을 참조합니다. 예: N9의 저장값은 4, 9.11 N9는 6입니다. 생산 누계와 달성률은 가져오지 않습니다. 2026.9.9!L5는 H5 대신 H6을 참조하는 등 행 이동 의심이 있습니다.

G302는 J7*C302 대신 J7*F302(전일재고)를 참조합니다. 위 표에 계수 차이로 포함했습니다. 코드/단위는 원본에 없으므로 R행번호와 개를 사용합니다. 음수 초기 재고는 원본 그대로 보존합니다. 이전 legacy-README의 106행/16모델 데이터는 현재 파일과 다르므로 사용하지 않았습니다.
