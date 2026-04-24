---
last_verified: "2026-04-25"
maintainer: "leedonwoo"
status: "draft"
note: "이 카탈로그는 자격증 행정·운영 정보의 변경에 따라 주기적으로 갱신되어야 합니다. 응시 결정 전 반드시 공식 홈페이지에서 최신 정보 재확인 필수."
---

# 지원 가능 자격증 카탈로그

`exam-workbook-builder`는 객관식 N지선다를 핵심 산출 형태로 삼는 **범용 프레임워크**입니다.
아래 카탈로그는 본 플러그인 파이프라인(M1 OCR → M2 구조화 → M3 개념 태깅 → M4 신규 문제 생성 → M5 export)을 그대로 적용할 수 있는지 여부와 적정 적용 강도를 정리한 것입니다.

## 적용 가능도 표기

- **🟢 직접 적용** — 시험이 객관식으로 거의 100% 구성. 본 플러그인의 표준 흐름이 그대로 동작.
- **🟡 부분 적용** — 객관식 + (서술형/실기/면접). 객관식 부분만 본 플러그인으로 처리하고 나머지 영역은 별도 도구가 필요.
- **🔵 보조 활용** — 시험 자체는 비객관식이지만 핵심 개념 정리·요약·예상 객관식 문제 학습 보조용으로 활용 가능.
- **⚪ 부적합** — 실기·작품·면접 비중 압도적이거나 본 도구가 다루는 범위를 벗어남 (참고용 표시).

> 객관식 비중은 응시년도·과목별로 변동 가능합니다. 표의 비중은 최근 공시 기준 추정.

---

## 1. IT · 데이터 (한국)

| 자격증 (KOR) | 영문 | cert_code 제안 | 주관 기관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|---|
| SQL 개발자 | SQLD | `sqld` | 한국데이터산업진흥원 | https://www.dataq.or.kr/ | 100% (50문항) | 🟢 |
| SQL 전문가 | SQLP | `sqlp` | 한국데이터산업진흥원 | https://www.dataq.or.kr/ | 객관식 80문항 + 서술 | 🟡 |
| 데이터분석 준전문가 | ADsP | `adsp` | 한국데이터산업진흥원 | https://www.dataq.or.kr/ | 100% (50문항) | 🟢 |
| 데이터분석 전문가 | ADP | `adp` | 한국데이터산업진흥원 | https://www.dataq.or.kr/ | 객관식 + 실기 R/Python | 🟡 |
| 빅데이터분석기사 | BDA | `bigdata` | 한국데이터산업진흥원 | https://www.dataq.or.kr/ | 필기 100% / 실기 작업형 | 🟡 |
| 정보처리기사 (필기) | EIP-W | `eip` | 한국산업인력공단 (Q-Net) | https://www.q-net.or.kr/ | 100% (5과목 100문항) | 🟢 |
| 정보처리기사 (실기) | EIP-P | `eip-prac` | 한국산업인력공단 | https://www.q-net.or.kr/ | 단답형·서술형·코드 | 🟡 |
| 정보처리산업기사 | EIP-I | `eip-i` | 한국산업인력공단 | https://www.q-net.or.kr/ | 100% (필기) | 🟢 |
| 정보처리기능사 | EIP-F | `eip-f` | 한국산업인력공단 | https://www.q-net.or.kr/ | 100% (필기) | 🟢 |
| 컴퓨터활용능력 1급 (필기) | CompProf 1 | `comp1` | 대한상공회의소 | https://license.korcham.net/ | 100% (3과목 60문항) | 🟢 |
| 컴퓨터활용능력 2급 (필기) | CompProf 2 | `comp2` | 대한상공회의소 | https://license.korcham.net/ | 100% (2과목 40문항) | 🟢 |
| 워드프로세서 (필기) | WP | `wp` | 대한상공회의소 | https://license.korcham.net/ | 100% | 🟢 |
| 정보보안기사 | InfoSec-E | `infosec` | 한국방송통신전파진흥원 (KCA) | https://www.kca.kr/ | 객관식 + 실기 단답·서술 | 🟡 |
| 정보보안산업기사 | InfoSec-I | `infosec-i` | KCA | https://www.kca.kr/ | 객관식 + 실기 | 🟡 |
| 리눅스마스터 1급 | LM1 | `linuxmaster1` | 한국정보통신진흥협회 (KAIT) | https://www.kait.or.kr/ | 1차 객관식 + 2차 객관식·작업형 | 🟡 |
| 리눅스마스터 2급 | LM2 | `linuxmaster2` | KAIT | https://www.kait.or.kr/ | 100% (1·2차 모두 객관식) | 🟢 |
| 네트워크관리사 1·2급 | NM | `netmgr1`/`netmgr2` | 한국정보통신자격협회 (ICQA) | https://www.icqa.or.kr/ | 필기 객관식 + 실기 작업형 | 🟡 |
| 정보기술자격(ITQ) | ITQ | `itq` | KPC | https://license.kpc.or.kr/ | 실기 위주 | ⚪ |
| GTQ (그래픽기술자격) | GTQ | `gtq` | KPC | https://license.kpc.or.kr/ | 실기(작품) | ⚪ |
| 전자상거래운용사 | EC-Op | `ecop` | 대한상공회의소 | https://license.korcham.net/ | 필기 100% | 🟢 |

## 2. IT · 글로벌

| 자격증 | 약어 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|---|
| AWS Certified Cloud Practitioner | CCP | `aws-ccp` | Amazon Web Services | https://aws.amazon.com/certification/ | 100% (65문항) | 🟢 |
| AWS Certified Solutions Architect – Associate | SAA | `aws-saa` | AWS | https://aws.amazon.com/certification/ | 100% | 🟢 |
| AWS Certified Developer – Associate | DVA | `aws-dva` | AWS | https://aws.amazon.com/certification/ | 100% | 🟢 |
| AWS Certified SysOps Administrator | SOA | `aws-soa` | AWS | https://aws.amazon.com/certification/ | 객관식 + 실습형 lab | 🟡 |
| Microsoft AZ-900 (Azure Fundamentals) | AZ-900 | `az-900` | Microsoft | https://learn.microsoft.com/credentials/ | 100% | 🟢 |
| Microsoft AZ-104 (Azure Administrator) | AZ-104 | `az-104` | Microsoft | https://learn.microsoft.com/credentials/ | 100% | 🟢 |
| Microsoft AZ-204 (Azure Developer) | AZ-204 | `az-204` | Microsoft | https://learn.microsoft.com/credentials/ | 100% | 🟢 |
| Google Cloud ACE | GCP-ACE | `gcp-ace` | Google Cloud | https://cloud.google.com/certification | 100% | 🟢 |
| Google Cloud PCA | GCP-PCA | `gcp-pca` | Google Cloud | https://cloud.google.com/certification | 100% | 🟢 |
| CKA (Certified Kubernetes Admin) | CKA | `cka` | CNCF / Linux Foundation | https://www.cncf.io/training/certification/cka/ | 실기 100% | ⚪ |
| CKAD (K8s App Developer) | CKAD | `ckad` | CNCF | https://www.cncf.io/training/certification/ckad/ | 실기 100% | ⚪ |
| OCJP / OCP Java | OCP-Java | `ocpj` | Oracle | https://education.oracle.com/ | 100% | 🟢 |
| OCP Database Administrator | OCP-DBA | `ocpdba` | Oracle | https://education.oracle.com/ | 100% | 🟢 |
| CISSP | CISSP | `cissp` | (ISC)² | https://www.isc2.org/Certifications/CISSP | 100% (CAT 형식) | 🟢 |
| CISA | CISA | `cisa` | ISACA | https://www.isaca.org/credentialing/cisa | 100% (150문항) | 🟢 |
| CISM | CISM | `cism` | ISACA | https://www.isaca.org/credentialing/cism | 100% | 🟢 |
| CompTIA A+ | A+ | `comptia-aplus` | CompTIA | https://www.comptia.org/certifications/a | 객관식 + 실습형 PBQ | 🟡 |
| CompTIA Security+ | SY0-x | `comptia-secplus` | CompTIA | https://www.comptia.org/certifications/security | 객관식 + PBQ | 🟡 |
| CompTIA Network+ | N+ | `comptia-netplus` | CompTIA | https://www.comptia.org/certifications/network | 객관식 + PBQ | 🟡 |
| Cisco CCNA | CCNA | `ccna` | Cisco | https://www.cisco.com/site/us/en/learn/training-certifications/ | 객관식 + 시뮬레이션 | 🟡 |
| Cisco CCNP Enterprise | CCNP-E | `ccnp-e` | Cisco | https://www.cisco.com/site/us/en/learn/training-certifications/ | 객관식 + 시뮬레이션 | 🟡 |
| PMP | PMP | `pmp` | PMI | https://www.pmi.org/certifications/project-management-pmp | 100% (180문항) | 🟢 |
| ITIL Foundation | ITIL-F | `itil-f` | PeopleCert (AXELOS) | https://www.peoplecert.org/ | 100% | 🟢 |
| Scrum Master (PSM I) | PSM-I | `psm1` | Scrum.org | https://www.scrum.org/professional-scrum-master-i-certification | 100% | 🟢 |
| Six Sigma Green Belt (ASQ) | SSGB | `ssgb` | ASQ | https://asq.org/cert/six-sigma-green-belt | 100% | 🟢 |

## 3. 회계 · 세무 · 사무

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 전산회계 1급 | `acct1` | 한국세무사회 | https://license.kacpta.or.kr/ | 이론 30% 객관식 + 실기 70% 프로그램 | 🟡 |
| 전산회계 2급 | `acct2` | 한국세무사회 | https://license.kacpta.or.kr/ | 이론 객관식 + 실기 | 🟡 |
| 전산세무 1급 | `tax1` | 한국세무사회 | https://license.kacpta.or.kr/ | 이론 객관식 + 실기 | 🟡 |
| 전산세무 2급 | `tax2` | 한국세무사회 | https://license.kacpta.or.kr/ | 이론 객관식 + 실기 | 🟡 |
| FAT 1·2급 | `fat1`/`fat2` | 한국공인회계사회 | https://license.kicpa.or.kr/ | 이론 객관식 + 실기 | 🟡 |
| TAT 1·2급 | `tat1`/`tat2` | 한국공인회계사회 | https://license.kicpa.or.kr/ | 이론 객관식 + 실기 | 🟡 |
| ERP 정보관리사 (회계·인사·물류·생산) | `erp-acc` 등 | 한국생산성본부 | https://license.kpc.or.kr/ | 이론 객관식 + 실기 | 🟡 |
| 비서 1·2·3급 | `sec1`/`sec2`/`sec3` | 대한상공회의소 | https://license.korcham.net/ | 필기 객관식 | 🟢 |

## 4. 어학

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| TOEIC | `toeic` | ETS | https://www.toeic.co.kr/ | 100% (LC/RC 200문항) | 🟢 |
| TOEFL iBT | `toefl` | ETS | https://www.ets.org/toefl/ | 객관식 + Speaking/Writing | 🟡 |
| OPIc | `opic` | ACTFL | https://www.opic.or.kr/ | 말하기 인터뷰 | ⚪ |
| TEPS | `teps` | 서울대 TEPS관리위원회 | https://www.teps.or.kr/ | 100% | 🟢 |
| TEPS Speaking·Writing | `teps-sw` | 서울대 TEPS관리위원회 | https://www.teps.or.kr/ | 말하기·서술 | ⚪ |
| TOPIK I·II | `topik1`/`topik2` | 국립국제교육원 | https://www.topik.go.kr/ | 객관식 + 쓰기(II) | 🟡 (I은 🟢) |
| JLPT N1~N5 | `jlpt-n1`...`jlpt-n5` | 일본국제교류기금 / JEES | https://www.jlpt.or.kr/ | 100% | 🟢 |
| HSK 1~6급 | `hsk1`...`hsk6` | 중국국가한반 | https://www.chinesetest.cn/ | 객관식 + 쓰기 | 🟡 (1·2급은 🟢) |
| TSC (중국어 말하기) | `tsc` | YBM | https://www.ybmtsc.co.kr/ | 말하기 | ⚪ |
| DELE A1~C2 | `dele-a1`...`dele-c2` | Instituto Cervantes | https://dele.cervantes.es/ | 객관식 + 작문·말하기 | 🟡 |
| DELF/DALF | `delf-b1` 등 | France Education International | https://www.france-education-international.fr/ | 청해·독해 객관식 + 작문·말하기 | 🟡 |
| IELTS | `ielts` | British Council / IDP | https://www.ielts.org/ | 객관식 + Writing/Speaking | 🟡 |
| FLEX | `flex` | 한국외대 | https://flex.hufs.ac.kr/ | 100% | 🟢 |
| KBS 한국어능력시험 | `kbslang` | KBS한국어진흥원 | https://www.klt.or.kr/ | 100% | 🟢 |

## 5. 금융 · 투자 · 보험

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 투자자산운용사 | `iam` | 금융투자협회 | https://license.kofia.or.kr/ | 100% | 🟢 |
| 펀드투자권유자문인력 | `fund-adv` | 금융투자협회 | https://license.kofia.or.kr/ | 100% | 🟢 |
| 증권투자권유자문인력 | `sec-adv` | 금융투자협회 | https://license.kofia.or.kr/ | 100% | 🟢 |
| 파생상품투자권유자문인력 | `deriv-adv` | 금융투자협회 | https://license.kofia.or.kr/ | 100% | 🟢 |
| 신용분석사 | `credit-anal` | 한국금융연수원 | https://www.kbi.or.kr/ | 100% | 🟢 |
| 자산관리사 (FP) | `kbi-fp` | 한국금융연수원 | https://www.kbi.or.kr/ | 100% | 🟢 |
| AFPK | `afpk` | 한국FPSB | https://www.fpsbkorea.org/ | 100% (4과목) | 🟢 |
| CFP | `cfp` | 한국FPSB | https://www.fpsbkorea.org/ | 객관식 + 사례서술 | 🟡 |
| CFA Level 1 | `cfa1` | CFA Institute | https://www.cfainstitute.org/programs/cfa | 100% | 🟢 |
| CFA Level 2 | `cfa2` | CFA Institute | https://www.cfainstitute.org/programs/cfa | 100% (item set) | 🟢 |
| CFA Level 3 | `cfa3` | CFA Institute | https://www.cfainstitute.org/programs/cfa | item set + 서술 | 🟡 |
| FRM Part 1·2 | `frm1`/`frm2` | GARP | https://www.garp.org/frm | 100% | 🟢 |
| 보험계리사 1차 | `actu1` | 금융감독원 | https://www.fss.or.kr/ | 객관식 (1차) | 🟢 |
| 보험계리사 2차 | `actu2` | 금융감독원 | https://www.fss.or.kr/ | 서술 (2차) | ⚪ |
| 손해사정사 1차 | `claimadj1` | 금융감독원 | https://www.fss.or.kr/ | 객관식 | 🟢 |
| 손해사정사 2차 | `claimadj2` | 금융감독원 | https://www.fss.or.kr/ | 서술 | ⚪ |
| 외환관리사 | `forex` | 한국금융연수원 | https://www.kbi.or.kr/ | 100% | 🟢 |

## 6. 무역 · 물류 · 유통

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 물류관리사 | `logistics` | 한국산업인력공단 | https://www.q-net.or.kr/ | 100% (5과목) | 🟢 |
| 국제무역사 1급 | `trade1` | 한국무역협회 | https://license.kita.net/ | 100% | 🟢 |
| 무역영어 1·2·3급 | `tradeen1` 등 | 대한상공회의소 | https://license.korcham.net/ | 100% | 🟢 |
| 유통관리사 1·2급 | `dist1`/`dist2` | 대한상공회의소 | https://license.korcham.net/ | 100% | 🟢 |
| 관세사 1차 | `customs1` | 한국산업인력공단 | https://www.q-net.or.kr/ | 객관식 | 🟢 |
| 관세사 2차 | `customs2` | 한국산업인력공단 | https://www.q-net.or.kr/ | 서술 | ⚪ |

## 7. 안전 · 환경 · 보건

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 산업안전기사 | `safety` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% / 실기 필답·작업형 | 🟡 |
| 산업안전산업기사 | `safety-i` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 산업위생관리기사 | `indhyg` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 위험물기능사 | `hazard-f` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 위험물산업기사 | `hazard-i` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 가스기사 | `gas` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 대기환경기사 | `air-env` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 수질환경기사 | `water-env` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 폐기물처리기사 | `waste` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 소음진동기사 | `noise` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |

## 8. 건설 · 기계 · 전기 · 화공

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 건축기사 | `arch` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 토목기사 | `civil` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 기계기사 | `mech` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 전기기사 | `elec` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 전기산업기사 | `elec-i` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 전기공사기사 | `elec-const` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 소방설비기사 (전기·기계) | `firesys-e`/`firesys-m` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 화공기사 | `chem` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 산업기계설비기사 | `indmach` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |

## 9. 의료 · 보건 · 약무

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 의사 국가시험 | `kmle` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |
| 치과의사 국가시험 | `kdle` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |
| 한의사 국가시험 | `kmle-orient` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |
| 약사 국가시험 | `kple` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |
| 간호사 국가시험 | `knle` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |
| 임상병리사 | `medtech` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 필기 100% / 실기 작업형 | 🟡 |
| 응급구조사 1·2급 | `emt1`/`emt2` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 필기 객관식 + 실기 | 🟡 |
| 영양사 | `dietitian` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |
| 위생사 | `sanitarian` | 한국보건의료인국가시험원 | https://www.kuksiwon.or.kr/ | 100% | 🟢 |

## 10. 부동산 · 행정 · 법무

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 공인중개사 | `realtor` | 한국산업인력공단 | https://www.q-net.or.kr/ | 1차·2차 모두 객관식 | 🟢 |
| 주택관리사 | `housemgr` | 한국산업인력공단 | https://www.q-net.or.kr/ | 1차 객관식 + 2차 객관·서술 혼합 | 🟡 |
| 감정평가사 1차 | `appraiser1` | 한국산업인력공단 | https://www.q-net.or.kr/ | 객관식 | 🟢 |
| 감정평가사 2차 | `appraiser2` | 한국산업인력공단 | https://www.q-net.or.kr/ | 서술 | ⚪ |
| 행정사 | `adminadv` | 한국산업인력공단 | https://www.q-net.or.kr/ | 1차 객관식 | 🟢 |
| 노무사 1차 | `laborlaw1` | 한국산업인력공단 | https://www.q-net.or.kr/ | 객관식 | 🟢 |
| 노무사 2차 | `laborlaw2` | 한국산업인력공단 | https://www.q-net.or.kr/ | 서술 | ⚪ |
| 변리사 1차 | `patent1` | 한국산업인력공단 | https://www.q-net.or.kr/ | 객관식 | 🟢 |
| 변리사 2차 | `patent2` | 한국산업인력공단 | https://www.q-net.or.kr/ | 서술 | ⚪ |
| 법무사 1차 | `judscv1` | 대법원 법원행정처 | https://exam.scourt.go.kr/ | 객관식 | 🟢 |
| 법무사 2차 | `judscv2` | 대법원 법원행정처 | https://exam.scourt.go.kr/ | 서술 | ⚪ |

## 11. 공무원 · 공공기관

| 자격증 / 시험 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| PSAT (행정고시 1차) | `psat` | 인사혁신처 | https://www.gosi.kr/ | 100% | 🟢 |
| 9급 공무원 공통과목 (국어/영어/한국사) | `gov9-common` | 인사혁신처 | https://www.gosi.kr/ | 100% | 🟢 |
| 9급 공무원 직렬과목 | `gov9-{직렬}` | 인사혁신처 | https://www.gosi.kr/ | 100% | 🟢 |
| 7급 공무원 PSAT | `gov7-psat` | 인사혁신처 | https://www.gosi.kr/ | 100% | 🟢 |
| NCS 직업기초능력평가 (공기업) | `ncs` | 각 공공기관 | (기관별) | 100% | 🟢 |
| 한국사능력검정시험 (심화·기본) | `khist-adv`/`khist-basic` | 국사편찬위원회 | https://www.historyexam.go.kr/ | 100% | 🟢 |

## 12. 심리 · 상담 · 사회복지

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 직업상담사 1급 | `voccoun1` | 한국산업인력공단 (Q-Net) | https://www.q-net.or.kr/ | 1차 객관식 100문항 + 2차 서술 | 🟡 |
| 직업상담사 2급 | `voccoun2` | 한국산업인력공단 | https://www.q-net.or.kr/ | 1차 객관식 100문항 + 2차 서술 | 🟡 |
| 청소년상담사 1급 | `youthcoun1` | 한국산업인력공단 (여성가족부) | https://www.q-net.or.kr/ | 1차 객관식 + 2차 면접 | 🟡 |
| 청소년상담사 2급 | `youthcoun2` | 한국산업인력공단 (여성가족부) | https://www.q-net.or.kr/ | 1차 객관식 + 2차 면접 | 🟡 |
| 청소년상담사 3급 | `youthcoun3` | 한국산업인력공단 (여성가족부) | https://www.q-net.or.kr/ | 1차 객관식 + 2차 면접 | 🟡 |
| 임상심리사 1급 | `clinpsy1` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 객관식 + 실기 서술 | 🟡 |
| 임상심리사 2급 | `clinpsy2` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 객관식 + 실기 서술 | 🟡 |
| 사회복지사 1급 | `socwel1` | 한국산업인력공단 | https://www.q-net.or.kr/ | 100% (3교시 200문항) | 🟢 |
| 청소년지도사 1·2·3급 | `youthldr1`/`youthldr2`/`youthldr3` | 한국산업인력공단 (여성가족부) | https://www.q-net.or.kr/ | 1차 객관식 + 2차 면접 | 🟡 |
| 상담심리사 1·2급 | `kcpa1`/`kcpa2` | 한국상담심리학회 | https://krcpa.or.kr/ | 자격시험 객관식·서술 + 면접 | 🟡 |
| 전문상담사 1·2급 | `kca1`/`kca2` | 한국상담학회 | https://counselors.or.kr/ | 자격시험 + 면접 | 🟡 |
| 정신건강임상심리사 1·2급 | `mhcp1`/`mhcp2` | 보건복지부 (수련기관) | https://www.mohw.go.kr/ | 수련 + 자격검정 | 🔵 |
| 보육교사 1·2·3급 | `childteach1`/`childteach2`/`childteach3` | 한국보육진흥원 | https://www.kcpi.or.kr/ | 자격연수 (시험 없음) | ⚪ |
| 평생교육사 1·2·3급 | `lifeedu1`/`lifeedu2`/`lifeedu3` | 국가평생교육진흥원 | https://www.nile.or.kr/ | 학점·자격연수 | ⚪ |

## 13. 디자인 · 기타 (참고)

| 자격증 | cert_code | 주관 | 공식 URL | 객관식 비중 | 적용 |
|---|---|---|---|---|---|
| 컬러리스트 산업기사 | `colorist-i` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 시각디자인산업기사 | `visdesign-i` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 제과·제빵기능사 | `bakery`/`patissier` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 조주기능사 (바텐더) | `bartender` | 한국산업인력공단 | https://www.q-net.or.kr/ | 필기 100% | 🟢 |
| 한국어교원 자격 | `koreantcr` | 국립국어원 | https://kteacher.korean.go.kr/ | 객관식 + 서술 | 🟡 |

---

## 갱신 정책 (운영 가이드)

이 카탈로그는 **반기 1회(매년 4월·10월) 정기 검증** + **시험 제도 개편 공지 발견 시 즉시 갱신**을 원칙으로 합니다.

검증 항목:
- [ ] 공식 URL 응답 확인 (도메인 변경/이전 추적)
- [ ] 주관 기관명 변경 (예: 기관 통폐합) 추적
- [ ] 출제 형식 변동 (객관식 비중·문항 수) 반영
- [ ] 신규 자격증 추가 (글로벌 IT 신규 인증, 데이터·AI 자격 등 빠른 영역)
- [ ] 폐지·통합 자격증 제거 또는 deprecated 표기

> 아직 카탈로그에 없는 자격증을 사용 중이라면 PR로 한 줄 추가만 해주셔도 충분합니다.
> cert_code 작명 규칙: 영문 소문자 + `-` 또는 숫자. 띄어쓰기·언더스코어 지양.

## 참고 출처

- 한국산업인력공단 큐넷: https://www.q-net.or.kr/
- 한국데이터산업진흥원: https://www.dataq.or.kr/
- 대한상공회의소 자격평가사업단: https://license.korcham.net/
- 한국세무사회: https://license.kacpta.or.kr/
- 한국공인회계사회: https://license.kicpa.or.kr/
- 금융투자협회 자격시험접수센터: https://license.kofia.or.kr/
- 한국금융연수원: https://www.kbi.or.kr/
- 한국FPSB: https://www.fpsbkorea.org/
- 한국보건의료인국가시험원: https://www.kuksiwon.or.kr/
- 인사혁신처 사이버국가고시센터: https://www.gosi.kr/
- 국사편찬위원회 한국사능력검정시험: https://www.historyexam.go.kr/
- 한국상담심리학회: https://krcpa.or.kr/
- 한국상담학회: https://counselors.or.kr/
- 한국보육진흥원: https://www.kcpi.or.kr/
- 국가평생교육진흥원: https://www.nile.or.kr/
