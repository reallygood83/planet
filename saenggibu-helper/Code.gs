/**
 * Main server-side code for Saenggibu Helper
 * This file contains the main entry point for the web app
 */

// Web app entry point
function doGet(e) {
  try {
    const htmlTemplate = HtmlService.createTemplateFromFile('index');
    
    // Pass any URL parameters to the template
    htmlTemplate.params = e.parameter;
    
    return htmlTemplate
      .evaluate()
      .setTitle('생기부 도우미')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    console.error('Error in doGet:', error);
    // Return error page
    return HtmlService.createHtmlOutput(`
      <html>
        <head>
          <title>오류 발생</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .error { color: red; background: #ffeeee; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>오류가 발생했습니다</h1>
          <div class="error">
            <p>${error.toString()}</p>
            <p>스택 추적:</p>
            <pre>${error.stack}</pre>
          </div>
        </body>
      </html>
    `);
  }
}

// Include other HTML files in the main template
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Get user email
function getUserEmail() {
  return Session.getActiveUser().getEmail();
}

// Initialize the app
function initializeApp() {
  try {
    // Check if user is authenticated
    const userEmail = getUserEmail();
    
    // Initialize data storage if needed
    const folders = getOrCreateAppFolders(); // Use the correct function name
    
    return {
      success: true,
      userEmail: userEmail,
      folderId: folders.mainFolderId
    };
  } catch (error) {
    console.error('Error initializing app:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Process uploaded file
function processUploadedFile(base64Data, fileName, mimeType) {
  try {
    console.log('Processing file:', fileName, 'Type:', mimeType);
    
    // Decode base64 data
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    
    let textContent = '';
    
    // Extract text based on file type
    if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
      textContent = blob.getDataAsString('UTF-8');
    } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Note: PDF text extraction in Apps Script is limited
      // For production, consider using Google Drive API or external service
      textContent = 'PDF 파일 처리는 현재 텍스트 붙여넣기를 사용해주세요.';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileName.endsWith('.docx')) {
      // For DOCX files, we'd need to use Drive API to convert
      // For now, return a message
      textContent = 'DOCX 파일 처리는 현재 텍스트 붙여넣기를 사용해주세요.';
    } else if (fileName.endsWith('.hwp')) {
      textContent = 'HWP 파일 처리는 현재 텍스트 붙여넣기를 사용해주세요.';
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }
    
    return {
      success: true,
      content: textContent,
      fileName: fileName
    };
    
  } catch (error) {
    console.error('Error processing file:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Process uploaded CSV file for student roster
 * @param {string} base64Data - Base64 encoded CSV data
 * @param {string} fileName - Original file name
 * @returns {Object} Processing result with student list
 */
function processStudentCSV(base64Data, fileName) {
  try {
    console.log('Processing student CSV:', fileName);
    
    // Decode base64 data
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'text/csv', fileName);
    const csvContent = blob.getDataAsString('UTF-8');
    
    // Parse CSV
    const students = parseStudentCSV(csvContent);
    
    if (students.length === 0) {
      return {
        success: false,
        error: '학생 데이터를 찾을 수 없습니다.'
      };
    }
    
    return {
      success: true,
      students: students,
      count: students.length
    };
    
  } catch (error) {
    console.error('Error processing student CSV:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 평가계획 관련 래퍼 함수들 (디버깅용)
function getEvaluationPlansWrapper() {
  console.log('=== getEvaluationPlansWrapper called ===');
  try {
    // dataManager.gs의 함수 호출
    const result = getEvaluationPlansSafe();
    console.log('Wrapper result:', result);
    console.log('Wrapper result type:', typeof result);
    console.log('Wrapper result is array:', Array.isArray(result));
    
    // 절대적으로 배열을 반환하도록 보장
    if (!result) {
      console.log('Result is falsy, returning empty array');
      return [];
    }
    if (!Array.isArray(result)) {
      console.log('Result is not array, returning empty array');
      console.log('Result properties:', Object.keys(result));
      return [];
    }
    
    console.log('Wrapper returning array with', result.length, 'items');
    return result;
  } catch (error) {
    console.error('getEvaluationPlansWrapper error:', error);
    console.error('Error stack:', error.stack);
    return [];
  }
}

// 가장 단순한 테스트 - 하드코딩된 평가계획 반환
function getHardcodedEvaluationPlans() {
  console.log('=== getHardcodedEvaluationPlans called ===');
  return [
    {
      id: 'test1',
      name: '테스트 평가계획 1',
      data: {
        subject: '수학',
        grade: '3학년',
        semester: '1학기',
        evaluations: []
      },
      createdDate: new Date(),
      modifiedDate: new Date()
    }
  ];
}

// JSON 문자열로 반환하는 버전
function getEvaluationPlansJSON() {
  console.log('=== getEvaluationPlansJSON called ===');
  try {
    const plans = getEvaluationPlansSafe();
    const jsonString = JSON.stringify(plans);
    console.log('Returning JSON string, length:', jsonString.length);
    return jsonString;
  } catch (error) {
    console.error('Error in getEvaluationPlansJSON:', error);
    return '[]';
  }
}

// Delete evaluation plan wrapper
function deleteEvaluationPlanJSON(planId) {
  console.log('=== deleteEvaluationPlanJSON called ===');
  console.log('Plan ID:', planId);
  try {
    const result = deleteEvaluationPlan(planId);
    const jsonString = JSON.stringify(result);
    console.log('Delete result:', result);
    return jsonString;
  } catch (error) {
    console.error('Error in deleteEvaluationPlanJSON:', error);
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
}