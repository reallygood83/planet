# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 작업할 때 참고할 지침을 제공합니다.

## 프로젝트 개요

"생기부 AI 도우미"는 초등학교 교사들이 AI를 활용하여 학생 생활기록부를 작성할 수 있도록 돕는 Google Apps Script 웹 애플리케이션입니다. Google Gemini API를 통해 AI 기반 콘텐츠 생성 기능을 제공하며, Google Drive/Sheets를 데이터 저장소로 활용합니다.

**중요**: 모든 AI 생성 콘텐츠는 NEIS 규정에 따라 명사형 종결어미(~함, ~임, ~됨, ~음)를 사용해야 합니다.

## 핵심 아키텍처

### 파일 구조 및 역할

**서버 측 (Google Apps Script):**
- `Code.gs` - 웹 앱의 `doGet()` 함수가 있는 메인 진입점
- `apiHandler.gs` - Gemini API 통합 (텍스트 분석, 콘텐츠 생성, 설문 질문 생성)
- `dataManager.gs` - Google Drive/Sheets 작업, Forms 생성, 응답 처리
- `utils.gs` - 바이트 계산 및 텍스트 처리를 위한 유틸리티 함수

**클라이언트 측 (HTML/CSS/JS):**
- `index.html` - 네비게이션과 페이지 구조를 포함한 메인 HTML
- `styles.html` - `<style>` 태그로 감싸진 모든 CSS 스타일
- `javascript.html` - `<script>` 태그로 감싸진 모든 클라이언트 JavaScript

### 데이터 흐름

1. **사용자 인증**: Session.getActiveUser()를 통한 Google 계정
2. **API 키 저장**: User Properties Service (개인별) 또는 Script Properties (대체)
3. **데이터 저장 구조**:
   ```
   생기부 AI 도우미/
   ├── users/                    # User-specific data isolation
   │   └── [userEmail]/
   │       ├── personal/         # Individual user data
   │       │   ├── 평가계획/     # Personal evaluation plans
   │       │   ├── 학생자료/     # Student evaluations
   │       │   └── 생성내용/     # Generated content
   │       └── participation/    # Group participation records
   └── shared/                   # Collaborative data
       └── [CODE]_[GroupName]/   # School code groups
           ├── metadata.json     # Group information & members
           ├── shared_plans/     # Shared evaluation plans
           └── discussions/      # Future: group discussions
   ```

### 핵심 기능 구현

1. **스마트 복사 & 붙여넣기**: `analyzeEvaluationPlan()`이 Gemini를 사용하여 붙여넣은 텍스트에서 구조화된 데이터 추출
2. **설문 생성**: 트리거를 통한 자동 응답 처리와 함께 Google Forms 생성
3. **콘텐츠 생성**: 특정 프롬프트를 사용한 세 가지 유형:
   - 교과학습발달상황
   - 창의적체험활동
   - 행동특성및종합의견
4. **학교 코드 시스템**: 교사 협업을 위한 6자리 영숫자 코드
   - 그룹 생성: `createSchoolCode()`가 고유 코드 생성
   - 그룹 참가: `joinSchoolCode()`가 코드 검증 및 멤버 추가
   - 데이터 격리: 개인 vs 공유 폴더 구조
5. **일괄 생성**: 진행 상황 추적과 함께 여러 학생 동시 처리
6. **사용자 관리**: Google 계정 인증을 통한 개별 데이터 저장

## 개발 명령어

### Google Apps Script 배포
```bash
# 빌드 프로세스 없음 - Apps Script 편집기에서 직접 배포
# 1. script.google.com 열기
# 2. 모든 .gs 및 .html 파일 복사
# 3. 배포 → 새 배포 → 웹 앱
# 4. 실행 계정: 나
# 5. 액세스 권한: Google 계정이 있는 모든 사용자
```

### 테스트
```javascript
// Apps Script 편집기에서 개별 함수 테스트
// 예시: API 연결 테스트
function testGeminiConnection() {
  const result = testGeminiConnection();
  console.log(result);
}
```

### 일반적인 작업

**새 서버 함수 추가:**
1. 적절한 .gs 파일에 함수 추가
2. 클라이언트에서 `google.script.run` 사용하여 호출

**UI 업데이트:**
1. `index.html`에서 HTML 수정
2. `styles.html`에서 스타일 업데이트
3. `javascript.html`에 JavaScript 핸들러 추가

## 중요한 구현 세부사항

### Gemini API 통합
- API 키는 User Properties (사용자별) 또는 Script Properties (전역)에 저장
- 프롬프트에 NEIS 규정 포함 (500자 제한, 금지어, 명사형 종결어미)
- Temperature는 균형 잡힌 창의성을 위해 0.7로 설정
- 모델: gemini-2.0-flash-exp

### Forms 응답 처리
- 폼 생성 시 자동 트리거 설정: `setupFormResponseTrigger()`
- 응답은 학생 이름 + 학급을 기본 키로 JSON 저장
- `syncFormResponses()`를 통한 수동 동기화 가능

### 학생-평가 매칭
- 기본 키: 학생 이름 + 학급명
- 제한사항: 같은 학급 내 중복 이름 처리 불가
- 데이터 저장 경로: `/users/[userEmail]/personal/학생자료/[className]/자기평가_[studentName]_[subject]_[date].json`

### 학교 코드 관리
- 6자리 영숫자 코드 (대문자와 숫자)
- 그룹 메타데이터는 `/shared/[CODE]_[GroupName]/metadata.json`에 저장
- Members 배열이 모든 참가자와 생성자 권한 추적
- 전체 공유 폴더 구조에서 코드 고유성 검증
- 그룹 생성 필수 항목: groupName, description, schoolName (선택: targetGrade, primarySubject)

### NEIS 규정 준수
- 문자 제한: 500자 (한글)
- 금지어: 뛰어난, 탁월한, 우수한, 최고의, 완벽한, 훌륭한
- 필수 명사형 종결어미: ~함, ~임, ~됨, ~음
- `validateNeisCompliance()` 함수에서 검증

## 오류 처리 패턴

모든 서버 함수는 이 패턴을 따릅니다:
```javascript
function serverFunction(params) {
  try {
    // 구현 내용
    return { success: true, data: result };
  } catch (error) {
    console.error('Error message:', error);
    return { success: false, error: error.toString() };
  }
}
```

클라이언트 측 호출:
```javascript
google.script.run
  .withSuccessHandler(handleSuccess)
  .withFailureHandler(handleError)
  .serverFunction(params);
```

## 핵심 아키텍처 패턴

### 사용자 데이터 격리
- 각 사용자는 `/users/[userEmail]/` 아래 전용 폴더 구조 할당
- 개인 데이터(평가계획, 학생 기록) 완전 격리
- 공유 데이터는 그룹 멤버십 검증을 통해 접근 가능
- 폴더 생성은 일관성을 위해 `getOrCreateFolder()` 헬퍼 사용

### 학교 코드 워크플로우
1. **코드 생성**: `generateSchoolCode()`가 고유한 6자리 코드 생성
2. **그룹 생성**: `createSchoolCode()`가 폴더 구조와 메타데이터 설정
3. **멤버 관리**: `joinSchoolCode()`가 코드 검증 및 멤버 추가
4. **참여 추적**: 빠른 접근을 위한 사용자 참여 기록 저장

### 일괄 처리
- 속도 제한 회피를 위한 순차적 API 호출
- 시각적 피드백과 함께 진행 상황 추적
- 학생별 개별 오류 처리
- 내보내기 기능 (텍스트, CSV, 클립보드)

### 모달 시스템
- 일관된 스타일링의 재사용 가능한 모달 컴포넌트
- 중첩된 클릭 가능 요소를 위한 이벤트 전파 처리
- 폼 검증 및 오류 표시 패턴
- 로딩 상태와 사용자 피드백 통합

## 데이터 호환성 아키텍처

### 다층 검색 전략
모든 데이터 접근 함수는 하위 호환성을 위한 3단계 폴백 시스템 구현:

1. **새로운 사용자별 구조** (우선)
   - `/users/[userEmail]/personal/` - 사용자의 격리된 데이터
   - 구성: 평가계획, 학급관리, 학생자료, 생성내용

2. **레거시 구조** (폴백)
   - `생기부 AI 도우미/` 루트 폴더
   - 하위 폴더: 평가계획, 학생자료, 생성내용

3. **직접 Drive 검색** (최후 수단)
   - 패턴 매칭과 함께 `DriveApp.searchFiles()` 사용
   - 모든 접근 가능한 파일 검색

### 핵심 호환성 함수
- `getClassList()` - 두 구조 + 직접 검색
- `getEvaluationPlans()` - `getEvaluationPlansFromFolder()` 헬퍼 사용
- `getStudentEvaluations()` - 직접 검색에 학급 검증 포함
- `getClassSelfEvaluations()` - 모든 학급 평가 집계

각 함수는 디버깅을 위해 어떤 구조에서 데이터를 찾았는지 로그:
```javascript
console.log('Found class in new structure:', className);
console.log('Found class in legacy structure:', className);
console.log('Found class by direct search:', className);
```

## 평가계획 구조

평가계획은 과목별 다중 평가 지원:
```javascript
{
  subject: "수학",
  grade: "5학년",
  semester: "1학기",
  evaluations: [{
    evaluationName: "평가1",
    achievementStandards: "...",
    evaluationCriteria: "...",
    evaluationMethod: "...",
    evaluationPeriod: "..."
  }]
}
```

## 학급 관리

### 학급 명단 구조
```javascript
{
  className: "5학년 3반",
  grade: "5학년",
  semester: "1학기",
  teacher: "김선생님",
  students: [{
    number: 1,
    name: "학생이름"
  }],
  createdAt: "ISO date",
  updatedAt: "ISO date"
}
```

### 일괄 생성 데이터 흐름
1. `getAllClasses()` → `getClassList()`로 학급 로드
2. 학급 선택 → `getClassRoster()`가 학생 목록 로드
3. 평가계획 로드 → `getEvaluationPlansJSON()`
4. 학급 평가 로드 → `getClassSelfEvaluations()`
5. 진행 상황 추적과 함께 학생별 콘텐츠 생성