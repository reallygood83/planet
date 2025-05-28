# 생기부 AI 도우미 - Google Apps Script 버전

초등교사를 위한 AI 기반 생활기록부 작성 도우미 웹 애플리케이션

## 📋 프로젝트 개요

이 프로젝트는 초등학교 교사들의 생활기록부(생기부) 작성 업무를 지원하는 Google Apps Script 기반 웹 애플리케이션입니다. Gemini AI를 활용하여 평가계획 분석, 학생 자기평가 설문 생성, 생기부 초안 작성을 도와줍니다.

### 주요 특징

- 🤖 **AI 기반 평가계획 분석**: 기존 평가계획서를 복사&붙여넣기하면 AI가 자동으로 분석
- 📝 **자기평가 설문 생성**: 평가계획을 기반으로 학생용 설문 문항 자동 생성
- 📄 **Google Forms 연동**: 생성된 설문을 Google Forms로 자동 변환
- ✍️ **생기부 초안 작성**: 교과학습발달상황, 창의적체험활동, 행동특성 및 종합의견 AI 작성
- ✅ **NEIS 규정 준수**: 글자 수 제한 및 금지어 자동 확인
- 🔒 **개인 API 키 사용**: 교사 개인의 Gemini API 키로 독립적 운영

## 🚀 시작하기

### 1. 사전 요구사항

- Google 계정
- [Google Gemini API 키](https://makersuite.google.com/app/apikey)
- 웹 브라우저 (Chrome 권장)

### 2. 설치 방법

1. [Google Apps Script](https://script.google.com) 접속
2. 새 프로젝트 생성
3. 프로젝트 파일들을 복사:
   - `Code.gs` → 코드.gs
   - `apiHandler.gs` → 새 스크립트 파일
   - `dataManager.gs` → 새 스크립트 파일
   - `utils.gs` → 새 스크립트 파일
   - `index.html` → 새 HTML 파일
   - `styles.html` → 새 HTML 파일
   - `javascript.html` → 새 HTML 파일

4. 배포:
   - 상단 메뉴에서 "배포" → "새 배포"
   - 유형: "웹 앱"
   - 실행: "나"
   - 액세스: "나만"
   - 배포 클릭

### 3. 초기 설정

1. 배포된 웹 앱 URL 접속
2. 설정 페이지에서 Gemini API 키 등록
3. API 키 상태가 "설정됨"으로 표시되는지 확인

## 📖 사용 방법

### 평가계획 입력

1. **스마트 복사&붙여넣기** (권장)
   - 기존 평가계획서 내용을 복사
   - "스마트 복사&붙여넣기" 버튼 클릭
   - 텍스트 영역에 붙여넣기
   - AI 분석 시작 → 자동으로 정리된 내용 확인

2. **템플릿 입력**
   - "템플릿 입력" 버튼 클릭
   - 과목, 학년, 성취기준 등 직접 입력
   - 저장

### 학생 자기평가 설문 생성

1. 자기평가 설문 탭으로 이동
2. 평가계획 선택
3. "AI 자기평가 설문 생성" 클릭
4. 생성된 설문 검토:
   - 객관식 3문항
   - 주관식 2문항
5. 설문 저장 또는 Google Forms로 내보내기

### 생기부 작성

1. 기본 정보 입력:
   - 학생 이름
   - 학급 (예: 5학년 3반)
   - 작성 항목 선택:
     - 교과학습발달상황 (과목 선택)
     - 창의적체험활동 (활동 종류 선택)
     - 행동특성 및 종합의견

2. 평가 정보 선택 (선택사항)

3. 학생 자기평가 결과 선택 (선택사항)

4. 교사 관찰 기록 입력

5. "AI 초안 생성" 클릭

6. 생성된 초안 검토 및 수정

7. NEIS에 복사&붙여딣기

## 🛠️ 기술 스택

- **플랫폼**: Google Apps Script
- **프론트엔드**: HTML, CSS, JavaScript
- **데이터 저장**: Google Drive, Google Sheets
- **AI**: Google Gemini API

## 📁 프로젝트 구조

```
saenggibu-helper/
├── Code.gs             # 메인 서버 코드
├── apiHandler.gs       # Gemini API 연동
├── dataManager.gs      # 데이터 저장/관리
├── utils.gs            # 유틸리티 함수
├── index.html          # 메인 HTML
├── styles.html         # CSS 스타일
├── javascript.html     # 클라이언트 JavaScript
└── README.md           # 프로젝트 문서
```

## ⚠️ 주의사항

- Gemini API 사용량에 따라 비용이 발생할 수 있습니다
- 생성된 내용은 반드시 교사가 검토 후 사용해야 합니다
- 학생 개인정보는 사용자의 Google Drive에만 저장됩니다

## 🔧 문제 해결

### API 키가 유효하지 않다고 표시될 때
1. API 키가 올바르게 복사되었는지 확인
2. [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 활성화 확인

### 생성된 내용이 너무 짧거나 길 때
- 교사 관찰 기록을 더 구체적으로 입력
- 평가계획의 성취기준이 명확한지 확인

## 📄 라이선스

이 프로젝트는 교육 목적으로 자유롭게 사용할 수 있습니다.

## 👥 기여

버그 신고나 기능 제안은 GitHub Issues를 통해 남겨주세요.

---

개발: Claude (Anthropic)  
프로젝트 관리: 안양 박달초 김문정