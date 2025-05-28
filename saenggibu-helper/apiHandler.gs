/**
 * API Handler for Gemini API integration
 * Handles all interactions with Google's Gemini AI
 * Supports: 평가계획 분석, 생기부 초안 생성, 자기평가 설문 생성
 */

// Gemini API configuration
function getGeminiApiKey() {
  // First check user properties (individual API key)
  const userKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (userKey) return userKey;
  
  // Fallback to script properties
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
}

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Analyze evaluation plan text and extract key information
 * @param {string} planText - The pasted evaluation plan text
 * @param {string} subjectFilter - Optional subject to filter for (empty string for all subjects)
 * @returns {Object} Extracted evaluation criteria
 */
function analyzeEvaluationPlan(planText, subjectFilter = '') {
  try {
    if (!planText || planText.trim() === '') {
      throw new Error('평가계획서 내용을 입력해주세요.');
    }
    
    const subjectPrompt = subjectFilter 
      ? `특히 "${subjectFilter}" 과목의 평가 정보만 추출해주세요. 다른 과목 정보는 제외하세요.`
      : '모든 과목의 평가 정보를 추출해주세요.';
    
    const prompt = `다음 평가계획서 텍스트를 분석하여 핵심 정보를 추출해주세요.
${subjectPrompt}

평가계획서 내용:
${planText}

다음 항목들을 JSON 형식으로 추출해주세요:
1. 과목명
2. 학년/학기
3. 평가 목록 (여러 개의 평가가 있을 수 있음)
   - 각 평가별 이름
   - 단원명
   - 성취기준 (배열)
   - 평가기준 (매우잘함/잘함/보통/노력요함)
   - 평가방법
   - 평가시기

JSON 형식:
{
  "subject": "과목명",
  "grade": "학년",
  "semester": "학기",
  "evaluations": [
    {
      "evaluationName": "평가명",
      "unitName": "단원명",
      "achievementStandards": ["성취기준1", "성취기준2"],
      "evaluationCriteria": {
        "excellent": "매우잘함 기준",
        "good": "잘함 기준",
        "average": "보통 기준",
        "needsImprovement": "노력요함 기준"
      },
      "evaluationMethod": "평가방법",
      "evaluationPeriod": "평가시기"
    }
  ]
}

만약 평가가 하나만 있거나 평가 구분이 명확하지 않으면, evaluations 배열에 하나의 평가만 포함시켜주세요.`;
    
    const response = callGeminiAPI(prompt);
    const extractedData = parseJsonResponse(response);
    
    return {
      success: true,
      data: extractedData
    };
  } catch (error) {
    console.error('Error analyzing evaluation plan:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Generate Saenggibu content for specific items
 * @param {Object} params - Parameters including type, studentData, evaluationData
 * @returns {Object} Response with generated content
 */
function generateSaenggibuContent(params) {
  try {
    const { type, studentName, observationNotes, selfEvaluation, evaluationPlan } = params;
    
    if (!type || !studentName) {
      throw new Error('필수 정보가 누락되었습니다.');
    }
    
    let prompt = '';
    
    switch (type) {
      case '교과학습발달상황':
        prompt = createSubjectDevelopmentPrompt(params);
        break;
      case '창의적체험활동':
        prompt = createCreativeActivityPrompt(params);
        break;
      case '행동특성및종합의견':
        prompt = createBehaviorPrompt(params);
        break;
      default:
        throw new Error('알 수 없는 생기부 항목입니다.');
    }
    
    const response = callGeminiAPI(prompt);
    const content = parseContentResponse(response);
    
    // Check NEIS compliance
    const validation = validateNeisCompliance(content);
    
    return {
      success: true,
      content: content,
      validation: validation
    };
    
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Generate content wrapper for batch generation
 * @param {Object} generationData - Data from batch generation form
 * @returns {Object} Generated content result
 */
function generateContent(generationData) {
  try {
    // Map batch generation data to generateSaenggibuContent params
    const params = {
      type: generationData.recordType,
      studentName: generationData.studentName,
      className: generationData.className,
      subject: generationData.subject,
      activityType: generationData.activityType,
      observationNotes: generationData.observationNotes,
      selfEvaluation: generationData.selfEvaluation || '',
      evaluationPlan: generationData.evaluationPlan || ''
    };
    
    // Call the main generation function
    const result = generateSaenggibuContent(params);
    
    // Return in the format expected by the client
    if (result.success) {
      return {
        content: result.content,
        validation: result.validation
      };
    } else {
      throw new Error(result.error || '콘텐츠 생성 중 오류가 발생했습니다.');
    }
    
  } catch (error) {
    console.error('Error in generateContent wrapper:', error);
    throw error; // Let the client handle the error
  }
}

/**
 * Generate student self-evaluation survey questions
 * @param {Object} evaluationPlan - The evaluation plan data
 * @returns {Object} Generated survey questions
 */
function generateSelfEvaluationQuestions(evaluationPlan) {
  try {
    const { subject, achievementStandards, evaluationCriteria } = evaluationPlan;
    
    const prompt = `다음 평가계획을 바탕으로 초등학생용 자기평가 설문 문항을 생성해주세요.

과목: ${subject}
성취기준: ${achievementStandards.join(', ')}

생성 지침:
1. 초등학생이 이해하기 쉬운 언어 사용
2. 객관식 3문항, 주관식 2문항 생성
3. 학습 이해도, 참여도, 느낀점을 포함
4. 구체적이고 명확한 질문

JSON 형식으로 반환:
{
  "multipleChoice": [
    {
      "question": "질문",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"]
    }
  ],
  "shortAnswer": [
    {
      "question": "질문",
      "guideline": "답변 가이드라인"
    }
  ]
}`;
    
    const response = callGeminiAPI(prompt);
    const questions = parseJsonResponse(response);
    
    return {
      success: true,
      questions: questions
    };
  } catch (error) {
    console.error('Error generating questions:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Create prompt for subject development (교과학습발달상황)
 */
function createSubjectDevelopmentPrompt(params) {
  const { studentName, subject, observationNotes, selfEvaluation, evaluationPlan } = params;
  
  return `당신은 초등학교 생활기록부 작성 전문가입니다.

다음 정보를 바탕으로 '${studentName}' 학생의 ${subject} 교과학습발달상황을 작성해주세요.

[평가 정보]
${evaluationPlan ? `성취기준: ${evaluationPlan.achievementStandards.join(', ')}` : ''}

[교사 관찰 내용]
${observationNotes || '특별한 관찰 내용 없음'}

[학생 자기평가]
${selfEvaluation || '자기평가 내용 없음'}

[작성 지침]
1. NEIS 교과학습발달상황 기재요령 준수
2. 학생의 성장과 발전 과정 중심 서술
3. 구체적인 학습 활동과 성취 내용 포함
4. 긍정적이고 건설적인 표현 사용
5. 500자 이내 (한글 기준)
6. 다음 금지어 사용 금지: 뛰어난, 탁월한, 우수한, 최고의
7. 반드시 명사형 종결어미(~함, ~임, ~됨, ~음 등)로 작성

한 가지 버전으로 작성해주세요.`;
}

/**
 * Create prompt for creative activities (창의적체험활동)
 */
function createCreativeActivityPrompt(params) {
  const { studentName, activityType, observationNotes, selfEvaluation } = params;
  
  return `당신은 초등학교 생활기록부 작성 전문가입니다.

다음 정보를 바탕으로 '${studentName}' 학생의 창의적체험활동(${activityType})을 작성해주세요.

[활동 관찰 내용]
${observationNotes || '특별한 관찰 내용 없음'}

[학생 자기평가]
${selfEvaluation || '자기평가 내용 없음'}

[작성 지침]
1. NEIS 창의적체험활동 기재요령 준수
2. 자율·자치활동, 동아리활동, 진로활동 통합 기재
3. 학생의 자발성, 협동성, 창의성 중심 서술
4. 구체적인 활동 사례와 역할 포함
5. 500자 이내 (한글 기준)
6. 금지어 사용 금지
7. 반드시 명사형 종결어미(~함, ~임, ~됨, ~음 등)로 작성

한 가지 버전으로 작성해주세요.`;
}

/**
 * Create prompt for behavior and comprehensive opinion (행동특성및종합의견)
 */
function createBehaviorPrompt(params) {
  const { studentName, observationNotes, yearSummary } = params;
  
  return `당신은 초등학교 생활기록부 작성 전문가입니다.

다음 정보를 바탕으로 '${studentName}' 학생의 행동특성 및 종합의견을 작성해주세요.

[연간 관찰 내용]
${observationNotes || '특별한 관찰 내용 없음'}

[학년 전체 활동 요약]
${yearSummary || '전체 활동 요약 없음'}

[작성 지침]
1. NEIS 행동특성 및 종합의견 기재요령 준수
2. 학생의 전반적인 학교생활 종합 서술
3. 인성, 학업, 특기사항 균형있게 포함
4. 학생의 성장 가능성과 잠재력 강조
5. 500자 이내 (한글 기준)
6. 금지어 사용 금지
7. 반드시 명사형 종결어미(~함, ~임, ~됨, ~음 등)로 작성

한 가지 버전으로 작성해주세요.`;
}

/**
 * Call Gemini API with the given prompt
 * @param {string} prompt - The prompt to send
 * @returns {Object} API response
 */
function callGeminiAPI(prompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
  }
  
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };
  
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    console.error('API Error:', response.getContentText());
    throw new Error(`API 요청 실패: ${responseCode}`);
  }
  
  return JSON.parse(response.getContentText());
}

/**
 * Parse JSON response from Gemini API
 */
function parseJsonResponse(response) {
  try {
    const content = response.candidates[0].content.parts[0].text;
    // Extract JSON from the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)```/) || content.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    throw new Error('응답 파싱 중 오류가 발생했습니다.');
  }
}

/**
 * Parse content response from Gemini API
 */
function parseContentResponse(response) {
  try {
    return response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Error parsing content response:', error);
    throw new Error('응답 파싱 중 오류가 발생했습니다.');
  }
}

/**
 * Validate NEIS compliance
 */
function validateNeisCompliance(content) {
  const forbiddenWords = ['뛰어난', '탁월한', '우수한', '최고의', '완벽한', '훌륭한'];
  const maxLength = 500; // characters
  
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    characterCount: content.length
  };
  
  // Check length
  if (content.length > maxLength) {
    validation.isValid = false;
    validation.errors.push(`글자 수 초과: ${content.length}자 (최대 ${maxLength}자)`);
  }
  
  // Check forbidden words
  forbiddenWords.forEach(word => {
    if (content.includes(word)) {
      validation.warnings.push(`금지어 발견: "${word}"`);
    }
  });
  
  return validation;
}

/**
 * Test Gemini API connection
 * @returns {Object} Connection test result with detailed status
 */
function testGeminiConnection() {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'API 키가 설정되지 않았습니다.'
      };
    }
    
    // Simple test prompt
    const prompt = '안녕하세요. 연결 테스트입니다. 한국어로 간단히 답해주세요.';
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100
      }
    };
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.candidates && jsonResponse.candidates.length > 0) {
        return {
          success: true,
          message: 'API 연결 성공'
        };
      }
    } else if (responseCode === 400) {
      return {
        success: false,
        error: 'API 키가 유효하지 않거나 잘못된 형식입니다.'
      };
    } else if (responseCode === 403) {
      return {
        success: false,
        error: 'API 키가 유효하지 않거나 권한이 없습니다. Gemini API가 활성화되어 있는지 확인하세요.'
      };
    } else {
      return {
        success: false,
        error: `API 오류 (코드: ${responseCode}): ${responseText}`
      };
    }
    
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      error: `연결 테스트 실패: ${error.toString()}`
    };
  }
}

/**
 * Set or update the user's Gemini API key
 * @param {string} apiKey - The API key to set
 */
function setUserGeminiApiKey(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      error: 'API 키를 입력해주세요.'
    };
  }
  
  // Save to user properties (individual key)
  PropertiesService.getUserProperties().setProperty('GEMINI_API_KEY', apiKey.trim());
  
  // Test the API key
  const testResult = testGeminiConnection();
  
  if (testResult.success) {
    return {
      success: true,
      message: 'API 키가 성공적으로 저장되었습니다.'
    };
  } else {
    // Remove the invalid key
    PropertiesService.getUserProperties().deleteProperty('GEMINI_API_KEY');
    
    return {
      success: false,
      error: testResult.error || 'API 키가 유효하지 않습니다.'
    };
  }
}

/**
 * Get user's API key status
 */
function getUserApiKeyStatus() {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    return {
      hasKey: false,
      isValid: false,
      message: 'API 키가 설정되지 않았습니다.'
    };
  }
  
  const testResult = testGeminiConnection();
  
  return {
    hasKey: true,
    isValid: testResult.success,
    message: testResult.success ? 'API 키가 유효합니다.' : testResult.error
  };
}