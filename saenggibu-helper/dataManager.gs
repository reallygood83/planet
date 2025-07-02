/**
 * Data Manager for Google Drive and Sheets operations
 * Handles storage and retrieval of evaluation data and generated content
 */

// Constants
const APP_FOLDER_NAME = '생기부 AI 도우미';
const USERS_FOLDER = 'users';
const SHARED_FOLDER = 'shared';
const EVALUATION_PLANS_FOLDER = '평가계획';
const STUDENT_DATA_FOLDER = '학생자료';
const GENERATED_CONTENT_FOLDER = '생성내용';
const PERSONAL_FOLDER = '개인자료';
const PARTICIPATION_FOLDER = '참여코드';
const SHARED_EVALUATIONS_FOLDER = '공유평가계획';
const SHARED_CLASSES_FOLDER = '공유학급자료';
const COLLABORATION_FOLDER = '협업기록';

/**
 * Get current user email
 * @returns {string} User email
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (error) {
    console.error('Error getting user email:', error);
    throw new Error('사용자 인증에 실패했습니다.');
  }
}

/**
 * Get or create user-specific folder structure
 * @returns {Object} User folder IDs
 */
function getUserFolders() {
  try {
    const userEmail = getCurrentUserEmail();
    const mainFolder = getMainAppFolder();
    
    // Create users folder
    const usersFolder = getOrCreateFolder(USERS_FOLDER, mainFolder);
    
    // Create user-specific folder
    const userFolder = getOrCreateFolder(userEmail, usersFolder);
    
    // Create personal data folder
    const personalFolder = getOrCreateFolder(PERSONAL_FOLDER, userFolder);
    
    // Create personal sub-folders
    const evaluationFolder = getOrCreateFolder(EVALUATION_PLANS_FOLDER, personalFolder);
    const studentFolder = getOrCreateFolder(STUDENT_DATA_FOLDER, personalFolder);
    const generatedFolder = getOrCreateFolder(GENERATED_CONTENT_FOLDER, personalFolder);
    
    // Create participation folder for school codes
    const participationFolder = getOrCreateFolder(PARTICIPATION_FOLDER, userFolder);
    
    console.log('User folders created/retrieved for:', userEmail);
    
    return {
      userEmail: userEmail,
      mainFolderId: mainFolder.getId(),
      userFolderId: userFolder.getId(),
      personalFolderId: personalFolder.getId(),
      evaluationFolderId: evaluationFolder.getId(),
      studentFolderId: studentFolder.getId(),
      generatedFolderId: generatedFolder.getId(),
      participationFolderId: participationFolder.getId()
    };
  } catch (error) {
    console.error('Error in getUserFolders:', error);
    throw error;
  }
}

/**
 * Get or create shared folder structure for school codes
 * @returns {Object} Shared folder structure
 */
function getSharedFolders() {
  try {
    const mainFolder = getMainAppFolder();
    const sharedFolder = getOrCreateFolder(SHARED_FOLDER, mainFolder);
    
    return {
      mainFolderId: mainFolder.getId(),
      sharedFolderId: sharedFolder.getId()
    };
  } catch (error) {
    console.error('Error in getSharedFolders:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 * @returns {Object} Folder IDs
 */
function getOrCreateAppFolders() {
  try {
    // For backward compatibility, return user folders
    return getUserFolders();
  } catch (error) {
    console.error('Error in getOrCreateAppFolders:', error);
    throw error;
  }
}

/**
 * Get folder URLs for debugging
 * @returns {Object} Folder information with URLs
 */
function getAppFolderInfo() {
  try {
    const folders = getOrCreateAppFolders();
    return {
      success: true,
      info: folders
    };
  } catch (error) {
    console.error('Error getting folder info:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Alternative method to find evaluation plans by searching all folders
 * @returns {Array} List of evaluation plans found by direct search
 */
function findEvaluationPlansBySearch() {
  try {
    console.log('Starting direct search for evaluation plan files...');
    
    // Search for files with the pattern "평가계획_"
    const files = DriveApp.searchFiles('title contains "평가계획_" and mimeType = "application/json"');
    
    const plans = [];
    let fileCount = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      fileCount++;
      console.log(`Found file ${fileCount}: ${file.getName()} (ID: ${file.getId()})`);
      
      try {
        const content = file.getBlob().getDataAsString();
        const data = JSON.parse(content);
        
        plans.push({
          id: file.getId(),
          name: file.getName(),
          data: data,
          createdDate: file.getDateCreated(),
          modifiedDate: file.getLastUpdated(),
          url: file.getUrl()
        });
        
        console.log('Successfully processed file:', file.getName());
      } catch (parseError) {
        console.error('Error parsing file:', file.getName(), parseError);
      }
    }
    
    console.log(`Direct search found ${fileCount} files, ${plans.length} valid evaluation plans`);
    
    // Sort by modified date (newest first)
    plans.sort((a, b) => b.modifiedDate - a.modifiedDate);
    
    return plans;
  } catch (error) {
    console.error('Error in direct search:', error);
    return [];
  }
}

/**
 * Get or create a folder
 */
function getOrCreateFolder(folderName, parentFolder = null) {
  try {
    let folders;
    
    if (parentFolder) {
      folders = parentFolder.getFoldersByName(folderName);
      console.log(`Searching for folder "${folderName}" in parent "${parentFolder.getName()}"`);
    } else {
      folders = DriveApp.getFoldersByName(folderName);
      console.log(`Searching for folder "${folderName}" in root`);
    }
    
    // Check if folder exists
    let foundFolder = null;
    let folderCount = 0;
    while (folders.hasNext()) {
      folderCount++;
      const folder = folders.next();
      console.log(`Found folder: ${folder.getName()} (ID: ${folder.getId()})`);
      if (!foundFolder) {
        foundFolder = folder;
      }
    }
    
    console.log(`Total folders found with name "${folderName}": ${folderCount}`);
    
    if (foundFolder) {
      return foundFolder;
    } else {
      console.log(`Creating new folder: ${folderName}`);
      if (parentFolder) {
        return parentFolder.createFolder(folderName);
      } else {
        return DriveApp.createFolder(folderName);
      }
    }
  } catch (error) {
    console.error(`Error in getOrCreateFolder for "${folderName}":`, error);
    throw error;
  }
}

/**
 * Get main app folder - checks both old and new naming conventions
 */
function getMainAppFolder() {
  try {
    // Try new name first
    let folders = DriveApp.getFoldersByName('생기부 AI 도우미');
    if (folders.hasNext()) {
      return folders.next();
    }
    
    // Try old name (without spaces)
    folders = DriveApp.getFoldersByName('생기부AI도우미');
    if (folders.hasNext()) {
      console.log('Found folder with old naming convention');
      return folders.next();
    }
    
    // If neither exists, create with new name
    console.log('Creating new main app folder');
    return DriveApp.createFolder('생기부 AI 도우미');
    
  } catch (error) {
    console.error('Error getting main app folder:', error);
    throw error;
  }
}

/**
 * Save evaluation plan data
 * @param {Object} evaluationData - The evaluation plan data (now supports multiple evaluations per subject)
 * @returns {Object} Result with file ID
 */
function saveEvaluationPlan(evaluationData) {
  try {
    console.log('saveEvaluationPlan called with:', JSON.stringify(evaluationData));
    
    const userFolders = getUserFolders();
    const personalFolder = DriveApp.getFolderById(userFolders.personalFolderId);
    
    // Get or create "평가계획" folder
    const evaluationFolder = getOrCreateFolder('평가계획', personalFolder);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `평가계획_${evaluationData.subject}_${evaluationData.grade}_${timestamp}.json`;
    
    // Ensure evaluationData has evaluations array
    if (!Array.isArray(evaluationData.evaluations)) {
      // Convert single evaluation to array format for backward compatibility
      evaluationData = {
        subject: evaluationData.subject,
        grade: evaluationData.grade,
        semester: evaluationData.semester,
        evaluations: [{
          evaluationName: evaluationData.evaluationName || '평가1',
          achievementStandards: evaluationData.achievementStandards,
          evaluationCriteria: evaluationData.evaluationCriteria,
          evaluationMethod: evaluationData.evaluationMethod,
          evaluationPeriod: evaluationData.evaluationPeriod
        }]
      };
    }
    
    console.log('Saving data:', JSON.stringify(evaluationData));
    console.log('Evaluation folder ID:', evaluationFolder.getId());
    console.log('Filename:', filename);
    
    // Save as JSON file
    const blob = Utilities.newBlob(JSON.stringify(evaluationData, null, 2), 'application/json', filename);
    const file = evaluationFolder.createFile(blob);
    
    console.log('File created successfully:', file.getId());
    
    return {
      success: true,
      fileId: file.getId(),
      fileName: filename
    };
  } catch (error) {
    console.error('Error saving evaluation plan:', error);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get all evaluation plans - SAFE VERSION
 * @returns {Array} List of evaluation plans - ALWAYS returns an array
 */
function getEvaluationPlansSafe() {
  console.log('=== getEvaluationPlansSafe START ===');
  
  // 무조건 배열을 반환하도록 강제
  let result = [];
  
  try {
    // First check if DriveApp is available
    try {
      DriveApp.getRootFolder();
      console.log('DriveApp is accessible');
    } catch (driveError) {
      console.error('DriveApp not accessible:', driveError);
      return [];
    }
    
    // Try to get evaluation plans
    try {
      result = getEvaluationPlans();
      console.log('getEvaluationPlans returned:', result);
      console.log('Result type:', typeof result);
      console.log('Is array:', Array.isArray(result));
    } catch (getError) {
      console.error('Error calling getEvaluationPlans:', getError);
      result = [];
    }
    
    // Ensure we always return an array
    if (result === null || result === undefined) {
      console.error('getEvaluationPlans returned null/undefined, returning empty array');
      return [];
    }
    
    if (!Array.isArray(result)) {
      console.error('getEvaluationPlans returned non-array:', typeof result, result);
      // If it's an object with a plans property, try to extract it
      if (result && result.plans && Array.isArray(result.plans)) {
        console.log('Extracting plans array from object');
        return result.plans;
      }
      return [];
    }
    
    console.log('=== getEvaluationPlansSafe END - returning array with', result.length, 'items ===');
    return result;
    
  } catch (error) {
    console.error('getEvaluationPlansSafe caught error:', error);
    console.error('Error stack:', error.stack);
    console.log('=== getEvaluationPlansSafe END - returning empty array due to error ===');
    return [];
  }
}

/**
 * Get all evaluation plans
 * @returns {Array} List of evaluation plans
 */
function getEvaluationPlans() {
  console.log('=== getEvaluationPlans() START ===');
  
  try {
    console.log('getEvaluationPlans called');
    
    // Method 1: Try new user-specific folder structure first
    let plans = [];
    try {
      const userFolders = getUserFolders();
      const personalFolder = DriveApp.getFolderById(userFolders.personalFolderId);
      
      // Look for "평가계획" folder in personal folder
      const evaluationFolders = personalFolder.getFoldersByName('평가계획');
      if (evaluationFolders.hasNext()) {
        const evaluationFolder = evaluationFolders.next();
        console.log('Found evaluation folder in new structure:', evaluationFolder.getName());
        
        plans = getEvaluationPlansFromFolder(evaluationFolder);
      }
    } catch (newStructureError) {
      console.log('New structure not available for evaluation plans:', newStructureError);
    }
    
    // Method 2: Try legacy structure if new structure has no data
    if (plans.length === 0) {
      try {
        const mainFolder = getMainAppFolder();
        const evaluationFolders = mainFolder.getFoldersByName('평가계획');
        
        if (evaluationFolders.hasNext()) {
          const evaluationFolder = evaluationFolders.next();
          console.log('Found evaluation folder in legacy structure:', evaluationFolder.getName());
          
          plans = getEvaluationPlansFromFolder(evaluationFolder);
        }
      } catch (legacyError) {
        console.log('Legacy structure not available for evaluation plans:', legacyError);
      }
    }
    
    // Method 3: If folder approach didn't work, try direct search
    if (plans.length === 0) {
      console.log('Folder-based search found no files, trying direct search...');
      plans = findEvaluationPlansBySearch();
    }
    
    // Sort by modified date (newest first)
    plans.sort((a, b) => b.modifiedDate - a.modifiedDate);
    
    console.log(`Final result: ${plans.length} evaluation plans found`);
    console.log('=== getEvaluationPlans() END - returning array ===');
    return plans || [];
  } catch (error) {
    console.error('Error getting evaluation plans:', error);
    console.error('Error stack:', error.stack);
    console.log('=== getEvaluationPlans() END - returning empty array due to error ===');
    return [];
  }
}

/**
 * Helper function to get evaluation plans from a specific folder
 * @param {Folder} folder - Folder to search for evaluation plans
 * @returns {Array} List of evaluation plans found in the folder
 */
function getEvaluationPlansFromFolder(folder) {
  const plans = [];
  
  try {
    const files = folder.getFiles();
    console.log('Files iterator created for evaluation plans');
    
    let fileCount = 0;
    while (files.hasNext()) {
      const file = files.next();
      fileCount++;
      console.log(`Processing file ${fileCount}: ${file.getName()}`);
      
      // Skip non-evaluation plan files
      if (!file.getName().startsWith('평가계획_')) {
        console.log('Skipping non-evaluation file:', file.getName());
        continue;
      }
      
      // Check if it's a JSON file
      if (!file.getName().endsWith('.json')) {
        console.log('Skipping non-JSON file:', file.getName());
        continue;
      }
      
      try {
        const content = file.getBlob().getDataAsString();
        const data = JSON.parse(content);
        
        plans.push({
          id: file.getId(),
          name: file.getName(),
          data: data,
          createdDate: file.getDateCreated(),
          modifiedDate: file.getLastUpdated()
        });
        
        console.log('Successfully processed file:', file.getName());
      } catch (parseError) {
        console.error('Error parsing file:', file.getName(), parseError);
      }
    }
    
    console.log(`Folder search found: ${fileCount} files, ${plans.length} evaluation plans`);
  } catch (error) {
    console.error('Error scanning folder for evaluation plans:', error);
  }
  
  return plans;
}

// 간단한 테스트 함수
function testGetEvaluationPlans() {
  try {
    console.log('=== getEvaluationPlans 테스트 시작 ===');
    const plans = getEvaluationPlans();
    console.log('plans 타입:', typeof plans);
    console.log('plans 값:', plans);
    console.log('plans 길이:', plans ? plans.length : 'null/undefined');
    return {
      success: true,
      type: typeof plans,
      isArray: Array.isArray(plans),
      length: plans ? plans.length : 0,
      plans: plans
    };
  } catch (error) {
    console.error('테스트 중 오류:', error);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

// 매우 간단한 함수로 통신 테스트
function testBasicReturn() {
  console.log('testBasicReturn called');
  return ['test1', 'test2', 'test3'];
}

// 빈 배열 반환 테스트
function testEmptyArray() {
  console.log('testEmptyArray called');
  return [];
}

// 직접 평가계획 가져오기 (가장 단순한 버전)
function getEvaluationPlansSimple() {
  console.log('getEvaluationPlansSimple called');
  try {
    // 단순히 빈 배열 반환
    return [];
  } catch (error) {
    console.error('getEvaluationPlansSimple error:', error);
    return [];
  }
}

// 단순한 배열 반환 테스트 함수
function testSimpleArrayReturn() {
  console.log('=== testSimpleArrayReturn called ===');
  try {
    const result = ['test1', 'test2', 'test3'];
    console.log('Returning array:', result);
    return result;
  } catch (error) {
    console.error('Error in testSimpleArrayReturn:', error);
    return [];
  }
}

// Google Apps Script 환경 테스트
function testEnvironment() {
  console.log('=== testEnvironment called ===');
  try {
    return {
      success: true,
      time: new Date().toString(),
      driveAppAvailable: typeof DriveApp !== 'undefined',
      scriptUser: Session.getActiveUser().getEmail(),
      executionTime: new Date().getTime()
    };
  } catch (error) {
    console.error('Error in testEnvironment:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 가장 간단한 테스트 - 문자열 반환
function testStringReturn() {
  console.log('testStringReturn called');
  return "This is a test string";
}

// 가장 간단한 테스트 - 숫자 반환
function testNumberReturn() {
  console.log('testNumberReturn called');
  return 42;
}

// 가장 간단한 테스트 - 객체 반환
function testObjectReturn() {
  console.log('testObjectReturn called');
  return {test: "value", number: 123};
}

// 디버깅을 위한 래퍼 함수
function debugGetEvaluationPlans() {
  console.log('=== debugGetEvaluationPlans START ===');
  
  try {
    // Method 1: Direct call
    console.log('Method 1: Direct call to getEvaluationPlans()');
    const directResult = getEvaluationPlans();
    console.log('Direct result type:', typeof directResult);
    console.log('Direct result is array:', Array.isArray(directResult));
    console.log('Direct result:', directResult);
    
    // Method 2: Through safe wrapper
    console.log('\nMethod 2: Call through getEvaluationPlansSafe()');
    const safeResult = getEvaluationPlansSafe();
    console.log('Safe result type:', typeof safeResult);
    console.log('Safe result is array:', Array.isArray(safeResult));
    console.log('Safe result:', safeResult);
    
    // Method 3: Simple array return test
    console.log('\nMethod 3: Simple array test');
    const simpleTest = ['item1', 'item2'];
    console.log('Simple test result:', simpleTest);
    
    console.log('=== debugGetEvaluationPlans END ===');
    
    return {
      directResult: directResult,
      safeResult: safeResult,
      simpleTest: simpleTest,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in debugGetEvaluationPlans:', error);
    return {
      error: error.toString(),
      stack: error.stack
    };
  }
}

// 수동 테스트용 함수 추가
function testFileSearch() {
  console.log('=== 파일 검색 테스트 시작 ===');
  
  // 1. 전체 드라이브에서 평가계획 파일 검색
  console.log('1. 전체 드라이브에서 평가계획 파일 검색');
  try {
    const allFiles = DriveApp.searchFiles('title contains "평가계획_"');
    let count = 0;
    while (allFiles.hasNext()) {
      const file = allFiles.next();
      count++;
      console.log(`파일 ${count}:`, file.getName(), file.getId(), file.getMimeType());
      console.log('  파일 위치:', file.getParents().hasNext() ? file.getParents().next().getName() : '루트');
    }
    console.log('전체 검색 결과:', count, '개 파일');
  } catch (error) {
    console.error('전체 검색 오류:', error);
  }
  
  // 2. 폴더 확인
  console.log('\n2. 폴더 구조 확인');
  try {
    const mainFolder = DriveApp.getFoldersByName('생기부 AI 도우미');
    if (mainFolder.hasNext()) {
      const folder = mainFolder.next();
      console.log('생기부 AI 도우미 폴더 ID:', folder.getId());
      
      const subFolders = folder.getFoldersByName('평가계획');
      if (subFolders.hasNext()) {
        const planFolder = subFolders.next();
        console.log('평가계획 폴더 ID:', planFolder.getId());
        
        const files = planFolder.getFiles();
        let fileCount = 0;
        while (files.hasNext()) {
          const file = files.next();
          fileCount++;
          console.log(`폴더 내 파일 ${fileCount}:`, file.getName(), file.getMimeType());
        }
        console.log('폴더 내 총 파일 수:', fileCount);
      } else {
        console.log('평가계획 폴더를 찾을 수 없음');
      }
    } else {
      console.log('생기부 AI 도우미 폴더를 찾을 수 없음');
    }
  } catch (error) {
    console.error('폴더 확인 오류:', error);
  }
  
  // 3. 기존 폴더 이름으로도 확인
  console.log('\n3. 생기부AI도우미 폴더로도 검색');
  try {
    const altMainFolder = DriveApp.getFoldersByName('생기부AI도우미');
    if (altMainFolder.hasNext()) {
      const folder = altMainFolder.next();
      console.log('생기부AI도우미 폴더 ID:', folder.getId());
      
      const subFolders = folder.getFoldersByName('평가계획');
      if (subFolders.hasNext()) {
        const planFolder = subFolders.next();
        console.log('평가계획 폴더 ID:', planFolder.getId());
        
        const files = planFolder.getFiles();
        let fileCount = 0;
        while (files.hasNext()) {
          const file = files.next();
          fileCount++;
          console.log(`폴더 내 파일 ${fileCount}:`, file.getName(), file.getMimeType());
        }
        console.log('폴더 내 총 파일 수:', fileCount);
      } else {
        console.log('평가계획 폴더를 찾을 수 없음');
      }
    } else {
      console.log('생기부AI도우미 폴더를 찾을 수 없음');
    }
  } catch (error) {
    console.error('대체 폴더 확인 오류:', error);
  }
  
  console.log('=== 파일 검색 테스트 완료 ===');
  return '테스트 완료 - 로그를 확인하세요';
}

/**
 * Update existing evaluation plan
 * @param {string} fileId - The file ID to update
 * @param {Object} evaluationData - The updated evaluation data
 * @returns {Object} Result
 */
function updateEvaluationPlan(fileId, evaluationData) {
  try {
    const file = DriveApp.getFileById(fileId);
    
    // Ensure evaluationData has evaluations array
    if (!Array.isArray(evaluationData.evaluations)) {
      // Convert single evaluation to array format for backward compatibility
      evaluationData = {
        subject: evaluationData.subject,
        grade: evaluationData.grade,
        semester: evaluationData.semester,
        evaluations: [{
          evaluationName: evaluationData.evaluationName || '평가1',
          achievementStandards: evaluationData.achievementStandards,
          evaluationCriteria: evaluationData.evaluationCriteria,
          evaluationMethod: evaluationData.evaluationMethod,
          evaluationPeriod: evaluationData.evaluationPeriod
        }]
      };
    }
    
    // Update file content
    const blob = Utilities.newBlob(JSON.stringify(evaluationData, null, 2), 'application/json');
    file.setContent(blob.getDataAsString());
    
    return {
      success: true,
      fileId: fileId
    };
  } catch (error) {
    console.error('Error updating evaluation plan:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Save student self-evaluation data
 * @param {Object} evaluationData - Student evaluation responses
 * @returns {Object} Result with file ID
 */
function saveStudentEvaluation(evaluationData) {
  try {
    const folders = getOrCreateAppFolders();
    const folder = DriveApp.getFolderById(folders.studentFolderId);
    
    // Create sub-folder for the class if needed
    const classFolder = getOrCreateFolder(evaluationData.className, folder);
    
    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `자기평가_${evaluationData.studentName}_${evaluationData.subject}_${timestamp}.json`;
    
    // Save as JSON file
    const blob = Utilities.newBlob(JSON.stringify(evaluationData, null, 2), 'application/json', filename);
    const file = classFolder.createFile(blob);
    
    return {
      success: true,
      fileId: file.getId(),
      fileName: filename
    };
  } catch (error) {
    console.error('Error saving student evaluation:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get student self-evaluation data
 * @param {string} studentName - Student name
 * @param {string} className - Class name
 * @returns {Array} List of evaluations
 */
function getStudentEvaluations(studentName, className) {
  try {
    console.log(`Getting evaluations for student: ${studentName} in class: ${className}`);
    let evaluations = [];
    
    // Method 1: Try new user-specific structure first
    try {
      const userFolders = getUserFolders();
      const personalFolder = DriveApp.getFolderById(userFolders.personalFolderId);
      
      // Look for "학생자료" folder in personal folder
      const studentDataFolders = personalFolder.getFoldersByName('학생자료');
      if (studentDataFolders.hasNext()) {
        const studentDataFolder = studentDataFolders.next();
        
        // Check if class folder exists
        const classFolders = studentDataFolder.getFoldersByName(className);
        if (classFolders.hasNext()) {
          console.log('Found class in new structure for student evaluations:', className);
          const classFolder = classFolders.next();
          evaluations = getStudentEvaluationsFromFolder(classFolder, studentName);
        }
      }
    } catch (newStructureError) {
      console.log('New structure not available for student evaluations:', newStructureError);
    }
    
    // Method 2: Try legacy structure if no data found
    if (evaluations.length === 0) {
      try {
        const mainFolder = getMainAppFolder();
        const studentDataFolders = mainFolder.getFoldersByName('학생자료');
        
        if (studentDataFolders.hasNext()) {
          const studentDataFolder = studentDataFolders.next();
          const classFolders = studentDataFolder.getFoldersByName(className);
          
          if (classFolders.hasNext()) {
            console.log('Found class in legacy structure for student evaluations:', className);
            const classFolder = classFolders.next();
            evaluations = getStudentEvaluationsFromFolder(classFolder, studentName);
          }
        }
      } catch (legacyError) {
        console.log('Legacy structure not available for student evaluations:', legacyError);
      }
    }
    
    // Method 3: Direct search as fallback
    if (evaluations.length === 0) {
      try {
        console.log('Trying direct search for student evaluations...');
        const files = DriveApp.searchFiles(`title contains "${studentName}" and title contains "자기평가"`);
        
        while (files.hasNext()) {
          const file = files.next();
          try {
            const content = file.getBlob().getDataAsString();
            const data = JSON.parse(content);
            
            // Check if this evaluation is for the correct class
            if (data.className === className) {
              evaluations.push({
                id: file.getId(),
                name: file.getName(),
                data: data,
                createdDate: file.getDateCreated()
              });
            }
          } catch (parseError) {
            console.error('Error parsing evaluation file:', file.getName(), parseError);
          }
        }
      } catch (searchError) {
        console.log('Direct search failed for student evaluations:', searchError);
      }
    }
    
    // Sort by creation date (newest first)
    evaluations.sort((a, b) => b.createdDate - a.createdDate);
    
    console.log(`Found ${evaluations.length} evaluations for ${studentName}`);
    return evaluations;
  } catch (error) {
    console.error('Error getting student evaluations:', error);
    return [];
  }
}

/**
 * Helper function to get student evaluations from a specific folder
 * @param {Folder} classFolder - Class folder to search
 * @param {string} studentName - Student name
 * @returns {Array} List of evaluations for the student
 */
function getStudentEvaluationsFromFolder(classFolder, studentName) {
  const evaluations = [];
  
  try {
    const files = classFolder.searchFiles(`title contains "${studentName}"`);
    
    while (files.hasNext()) {
      const file = files.next();
      try {
        const content = file.getBlob().getDataAsString();
        const data = JSON.parse(content);
        
        evaluations.push({
          id: file.getId(),
          name: file.getName(),
          data: data,
          createdDate: file.getDateCreated()
        });
      } catch (parseError) {
        console.error('Error parsing evaluation file:', file.getName(), parseError);
      }
    }
  } catch (error) {
    console.error('Error scanning folder for student evaluations:', error);
  }
  
  return evaluations;
}

/**
 * Get all self-evaluations for a class (for batch generation)
 * @param {string} className - Class name
 * @returns {Array} List of all evaluations in the class
 */
function getClassSelfEvaluations(className) {
  try {
    console.log(`Getting class self-evaluations for: ${className}`);
    let evaluations = [];
    
    // Method 1: Try new user-specific structure first
    try {
      const userFolders = getUserFolders();
      const personalFolder = DriveApp.getFolderById(userFolders.personalFolderId);
      
      // Look for "학생자료" folder in personal folder
      const studentDataFolders = personalFolder.getFoldersByName('학생자료');
      if (studentDataFolders.hasNext()) {
        const studentDataFolder = studentDataFolders.next();
        
        // Check if class folder exists
        const classFolders = studentDataFolder.getFoldersByName(className);
        if (classFolders.hasNext()) {
          console.log('Found class in new structure for class evaluations:', className);
          const classFolder = classFolders.next();
          evaluations = getClassSelfEvaluationsFromFolder(classFolder);
        }
      }
    } catch (newStructureError) {
      console.log('New structure not available for class evaluations:', newStructureError);
    }
    
    // Method 2: Try legacy structure if no data found
    if (evaluations.length === 0) {
      try {
        const mainFolder = getMainAppFolder();
        const studentDataFolders = mainFolder.getFoldersByName('학생자료');
        
        if (studentDataFolders.hasNext()) {
          const studentDataFolder = studentDataFolders.next();
          const classFolders = studentDataFolder.getFoldersByName(className);
          
          if (classFolders.hasNext()) {
            console.log('Found class in legacy structure for class evaluations:', className);
            const classFolder = classFolders.next();
            evaluations = getClassSelfEvaluationsFromFolder(classFolder);
          }
        }
      } catch (legacyError) {
        console.log('Legacy structure not available for class evaluations:', legacyError);
      }
    }
    
    // Method 3: Direct search as fallback
    if (evaluations.length === 0) {
      try {
        console.log('Trying direct search for class evaluations...');
        const files = DriveApp.searchFiles(`title contains "자기평가_" and title contains "${className}"`);
        
        while (files.hasNext()) {
          const file = files.next();
          try {
            const content = file.getBlob().getDataAsString();
            const data = JSON.parse(content);
            
            evaluations.push({
              id: file.getId(),
              name: file.getName(),
              data: data,
              createdDate: file.getDateCreated()
            });
          } catch (parseError) {
            console.error('Error parsing evaluation file:', file.getName(), parseError);
          }
        }
      } catch (searchError) {
        console.log('Direct search failed for class evaluations:', searchError);
      }
    }
    
    // Sort by creation date (newest first)
    evaluations.sort((a, b) => b.createdDate - a.createdDate);
    
    console.log(`Found ${evaluations.length} class evaluations for ${className}`);
    return evaluations;
  } catch (error) {
    console.error('Error getting class self evaluations:', error);
    return [];
  }
}

/**
 * Helper function to get all self-evaluations from a class folder
 * @param {Folder} classFolder - Class folder to search
 * @returns {Array} List of all self-evaluations in the class
 */
function getClassSelfEvaluationsFromFolder(classFolder) {
  const evaluations = [];
  
  try {
    const files = classFolder.getFiles();
    
    while (files.hasNext()) {
      const file = files.next();
      // Only include self-evaluation files
      if (file.getName().includes('자기평가_')) {
        try {
          const content = file.getBlob().getDataAsString();
          const data = JSON.parse(content);
          
          evaluations.push({
            id: file.getId(),
            name: file.getName(),
            data: data,
            createdDate: file.getDateCreated()
          });
        } catch (parseError) {
          console.error('Error parsing evaluation file:', file.getName(), parseError);
        }
      }
    }
  } catch (error) {
    console.error('Error scanning folder for class evaluations:', error);
  }
  
  return evaluations;
}

/**
 * Save generated Saenggibu content
 * @param {Object} contentData - The generated content data
 * @returns {Object} Result with file ID
 */
function saveGeneratedContent(contentData) {
  try {
    const folders = getOrCreateAppFolders();
    const folder = DriveApp.getFolderById(folders.generatedFolderId);
    
    // Create sub-folder for the date
    const dateFolder = getOrCreateFolder(new Date().toISOString().split('T')[0], folder);
    
    // Create filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `생기부_${contentData.type}_${contentData.studentName}_${timestamp}.json`;
    
    // Add metadata
    const saveData = {
      ...contentData,
      generatedAt: new Date().toISOString(),
      generatedBy: getUserEmail()
    };
    
    // Save as JSON file
    const blob = Utilities.newBlob(JSON.stringify(saveData, null, 2), 'application/json', filename);
    const file = dateFolder.createFile(blob);
    
    return {
      success: true,
      fileId: file.getId(),
      fileName: filename
    };
  } catch (error) {
    console.error('Error saving generated content:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get generated content history
 * @param {Object} filters - Optional filters (studentName, type, dateRange)
 * @returns {Array} List of generated content
 */
function getGeneratedContentHistory(filters = {}) {
  try {
    const folders = getOrCreateAppFolders();
    const folder = DriveApp.getFolderById(folders.generatedFolderId);
    
    let searchQuery = 'mimeType = "application/json"';
    if (filters.studentName) {
      searchQuery += ` and title contains "${filters.studentName}"`;
    }
    if (filters.type) {
      searchQuery += ` and title contains "${filters.type}"`;
    }
    
    const files = folder.searchFiles(searchQuery);
    const contents = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      const data = JSON.parse(content);
      
      contents.push({
        id: file.getId(),
        name: file.getName(),
        data: data,
        createdDate: file.getDateCreated()
      });
    }
    
    // Sort by created date (newest first)
    contents.sort((a, b) => b.createdDate - a.createdDate);
    
    // Apply limit if specified
    if (filters.limit) {
      return contents.slice(0, filters.limit);
    }
    
    return contents;
  } catch (error) {
    console.error('Error getting content history:', error);
    return [];
  }
}

/**
 * Export evaluation plan as template
 * @param {string} planId - The evaluation plan ID
 * @returns {Object} Template data
 */
function exportEvaluationTemplate(planId) {
  try {
    const file = DriveApp.getFileById(planId);
    const content = file.getBlob().getDataAsString();
    const data = JSON.parse(content);
    
    // Remove personal data, keep only template structure
    const template = {
      subject: data.subject,
      grade: data.grade,
      semester: data.semester,
      achievementStandards: data.achievementStandards,
      evaluationCriteria: data.evaluationCriteria,
      evaluationMethod: data.evaluationMethod,
      evaluationPeriod: data.evaluationPeriod
    };
    
    return {
      success: true,
      template: template
    };
  } catch (error) {
    console.error('Error exporting template:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Import evaluation template
 * @param {Object} template - The template data
 * @returns {Object} Result
 */
function importEvaluationTemplate(template) {
  try {
    // Validate template structure
    const requiredFields = ['subject', 'grade', 'achievementStandards'];
    for (const field of requiredFields) {
      if (!template[field]) {
        throw new Error(`필수 필드가 누락되었습니다: ${field}`);
      }
    }
    
    // Save as new evaluation plan
    return saveEvaluationPlan(template);
  } catch (error) {
    console.error('Error importing template:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Save generated survey questions
 * @param {Object} surveyData - The survey data including questions
 * @returns {Object} Result with file ID
 */
function saveSurveyQuestions(surveyData) {
  try {
    const folders = getOrCreateAppFolders();
    const folder = DriveApp.getFolderById(folders.evaluationFolderId);
    
    // Create sub-folder for surveys if needed
    const surveyFolder = getOrCreateFolder('설문문항', folder);
    
    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `설문_${surveyData.subject}_${surveyData.grade}_${timestamp}.json`;
    
    // Save as JSON file
    const blob = Utilities.newBlob(JSON.stringify(surveyData, null, 2), 'application/json', filename);
    const file = surveyFolder.createFile(blob);
    
    return {
      success: true,
      fileId: file.getId(),
      fileName: filename
    };
  } catch (error) {
    console.error('Error saving survey questions:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get saved survey questions
 * @returns {Array} List of saved surveys
 */
function getSavedSurveys() {
  try {
    const folders = getOrCreateAppFolders();
    const evaluationFolder = DriveApp.getFolderById(folders.evaluationFolderId);
    
    // Check if survey folder exists
    const surveyFolders = evaluationFolder.getFoldersByName('설문문항');
    if (!surveyFolders.hasNext()) {
      return [];
    }
    
    const surveyFolder = surveyFolders.next();
    const files = surveyFolder.getFilesByType(MimeType.JSON);
    
    const surveys = [];
    while (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      const data = JSON.parse(content);
      
      surveys.push({
        id: file.getId(),
        name: file.getName(),
        data: data,
        createdDate: file.getDateCreated()
      });
    }
    
    // Sort by created date (newest first)
    surveys.sort((a, b) => b.createdDate - a.createdDate);
    
    return surveys;
  } catch (error) {
    console.error('Error getting saved surveys:', error);
    return [];
  }
}

/**
 * Create Google Form from survey questions
 * @param {Object} surveyData - The survey data
 * @returns {Object} Result with form URL
 */
function createGoogleForm(surveyData) {
  try {
    // Create form
    const form = FormApp.create(`${surveyData.subject} 자기평가 - ${surveyData.grade} ${surveyData.semester}`);
    
    // Add description
    form.setDescription(`${surveyData.subject} 수업에 대한 자기평가입니다. 솔직하게 답변해주세요.`);
    
    // Configure form settings for public access
    form.setRequireSignIn(false);           // 로그인 불필요 설정
    form.setLimitOneResponsePerUser(false); // 중복 응답 허용 (같은 기기에서 여러 학생 가능)
    form.setAcceptingResponses(true);       // 응답 수집 활성화
    form.setAllowResponseEdits(false);      // 응답 수정 비허용 (데이터 무결성)
    form.setCollectEmail(false);            // 이메일 수집 비활성화 (익명성 보장)
    form.setPublishingSummary(false);       // 응답 요약 공개 비활성화
    
    // Store metadata in form description (hidden)
    const metadata = {
      subject: surveyData.subject,
      grade: surveyData.grade,
      semester: surveyData.semester,
      questions: surveyData.questions,
      createdBy: Session.getActiveUser().getEmail(),
      createdAt: new Date().toISOString()
    };
    
    // Add metadata as a hidden property
    PropertiesService.getDocumentProperties().setProperty(`form_${form.getId()}`, JSON.stringify(metadata));
    
    // Add student name field
    form.addTextItem()
      .setTitle('학생 이름')
      .setRequired(true);
      
    // Add class field
    form.addTextItem()
      .setTitle('학급')
      .setHelpText('예: 5학년 3반')
      .setRequired(true);
    
    // Add multiple choice questions
    if (surveyData.questions.multipleChoice) {
      surveyData.questions.multipleChoice.forEach((q, index) => {
        const item = form.addMultipleChoiceItem();
        item.setTitle(`${index + 1}. ${q.question}`)
          .setChoiceValues(q.options)
          .setRequired(true);
      });
    }
    
    // Add short answer questions
    if (surveyData.questions.shortAnswer) {
      surveyData.questions.shortAnswer.forEach((q, index) => {
        const item = form.addParagraphTextItem();
        item.setTitle(`${surveyData.questions.multipleChoice.length + index + 1}. ${q.question}`);
        if (q.guideline) {
          item.setHelpText(q.guideline);
        }
        item.setRequired(true);
      });
    }
    
    // Set up form response trigger
    setupFormResponseTrigger(form.getId());
    
    // Get form URL
    const formUrl = form.getPublishedUrl();
    const editUrl = form.getEditUrl();
    
    // Save form reference
    saveFormReference({
      formId: form.getId(),
      subject: surveyData.subject,
      grade: surveyData.grade,
      semester: surveyData.semester,
      formUrl: formUrl,
      editUrl: editUrl
    });
    
    return {
      success: true,
      formUrl: formUrl,
      editUrl: editUrl,
      formId: form.getId()
    };
  } catch (error) {
    console.error('Error creating Google Form:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Set up trigger for form responses
 * @param {string} formId - The form ID
 */
function setupFormResponseTrigger(formId) {
  try {
    // Remove existing triggers for this form
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processFormResponse' && 
          trigger.getTriggerSourceId() === formId) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger
    ScriptApp.newTrigger('processFormResponse')
      .forForm(formId)
      .onFormSubmit()
      .create();
  } catch (error) {
    console.error('Error setting up form trigger:', error);
  }
}

/**
 * Process form response and save as JSON
 * @param {Object} e - Form submit event
 */
function processFormResponse(e) {
  try {
    const formId = e.source.getId();
    const responses = e.response.getItemResponses();
    
    // Get form metadata
    const metadataStr = PropertiesService.getDocumentProperties().getProperty(`form_${formId}`);
    if (!metadataStr) {
      console.error('Form metadata not found');
      return;
    }
    
    const metadata = JSON.parse(metadataStr);
    
    // Extract student info and responses
    let studentName = '';
    let className = '';
    const questionResponses = {
      multipleChoice: [],
      shortAnswer: []
    };
    
    responses.forEach((response, index) => {
      const title = response.getItem().getTitle();
      const answer = response.getResponse();
      
      if (title === '학생 이름') {
        studentName = answer;
      } else if (title === '학급') {
        className = answer;
      } else {
        // Determine if multiple choice or short answer
        const questionNumber = parseInt(title.split('.')[0]) - 1;
        
        if (questionNumber < metadata.questions.multipleChoice.length) {
          // Multiple choice question
          const question = metadata.questions.multipleChoice[questionNumber];
          questionResponses.multipleChoice.push({
            question: question.question,
            answer: answer
          });
        } else {
          // Short answer question
          const shortAnswerIndex = questionNumber - metadata.questions.multipleChoice.length;
          const question = metadata.questions.shortAnswer[shortAnswerIndex];
          questionResponses.shortAnswer.push({
            question: question.question,
            answer: answer
          });
        }
      }
    });
    
    // Save student evaluation
    const evaluationData = {
      studentName: studentName,
      className: className,
      subject: metadata.subject,
      grade: metadata.grade,
      semester: metadata.semester,
      responses: questionResponses,
      submittedAt: new Date().toISOString(),
      formId: formId
    };
    
    saveStudentEvaluation(evaluationData);
    
  } catch (error) {
    console.error('Error processing form response:', error);
  }
}

/**
 * Save form reference for tracking
 * @param {Object} formData - Form reference data
 */
function saveFormReference(formData) {
  try {
    const folders = getOrCreateAppFolders();
    const folder = DriveApp.getFolderById(folders.evaluationFolderId);
    
    // Create sub-folder for form references if needed
    const formFolder = getOrCreateFolder('Forms', folder);
    
    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Form_${formData.subject}_${formData.grade}_${timestamp}.json`;
    
    // Save as JSON file
    const blob = Utilities.newBlob(JSON.stringify(formData, null, 2), 'application/json', filename);
    const file = formFolder.createFile(blob);
    
    return {
      success: true,
      fileId: file.getId()
    };
  } catch (error) {
    console.error('Error saving form reference:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get forms created by the user
 * @returns {Array} List of forms
 */
function getUserForms() {
  try {
    const folders = getOrCreateAppFolders();
    const evaluationFolder = DriveApp.getFolderById(folders.evaluationFolderId);
    
    // Check if Forms folder exists
    const formFolders = evaluationFolder.getFoldersByName('Forms');
    if (!formFolders.hasNext()) {
      return [];
    }
    
    const formFolder = formFolders.next();
    const files = formFolder.getFilesByType(MimeType.JSON);
    
    const forms = [];
    while (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      const data = JSON.parse(content);
      
      // Check if form still exists
      try {
        const form = FormApp.openById(data.formId);
        forms.push({
          ...data,
          responseCount: form.getResponses().length,
          lastResponseDate: form.getResponses().length > 0 ? 
            form.getResponses()[form.getResponses().length - 1].getTimestamp() : null
        });
      } catch (e) {
        // Form may have been deleted
        console.log('Form not accessible:', data.formId);
      }
    }
    
    return forms;
  } catch (error) {
    console.error('Error getting user forms:', error);
    return [];
  }
}

/**
 * Sync form responses to student evaluations
 * @param {string} formId - The form ID to sync
 * @returns {Object} Sync result
 */
function syncFormResponses(formId) {
  try {
    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    
    // Get form metadata
    const metadataStr = PropertiesService.getDocumentProperties().getProperty(`form_${formId}`);
    if (!metadataStr) {
      throw new Error('Form metadata not found');
    }
    
    const metadata = JSON.parse(metadataStr);
    let syncCount = 0;
    
    // Process each response
    responses.forEach(formResponse => {
      const itemResponses = formResponse.getItemResponses();
      
      // Extract student info and responses (similar to processFormResponse)
      let studentName = '';
      let className = '';
      const questionResponses = {
        multipleChoice: [],
        shortAnswer: []
      };
      
      itemResponses.forEach((response) => {
        const title = response.getItem().getTitle();
        const answer = response.getResponse();
        
        if (title === '학생 이름') {
          studentName = answer;
        } else if (title === '학급') {
          className = answer;
        } else {
          const questionNumber = parseInt(title.split('.')[0]) - 1;
          
          if (questionNumber < metadata.questions.multipleChoice.length) {
            const question = metadata.questions.multipleChoice[questionNumber];
            questionResponses.multipleChoice.push({
              question: question.question,
              answer: answer
            });
          } else {
            const shortAnswerIndex = questionNumber - metadata.questions.multipleChoice.length;
            const question = metadata.questions.shortAnswer[shortAnswerIndex];
            questionResponses.shortAnswer.push({
              question: question.question,
              answer: answer
            });
          }
        }
      });
      
      // Save student evaluation
      const evaluationData = {
        studentName: studentName,
        className: className,
        subject: metadata.subject,
        grade: metadata.grade,
        semester: metadata.semester,
        responses: questionResponses,
        submittedAt: formResponse.getTimestamp().toISOString(),
        formId: formId
      };
      
      const result = saveStudentEvaluation(evaluationData);
      if (result.success) {
        syncCount++;
      }
    });
    
    return {
      success: true,
      syncCount: syncCount,
      totalResponses: responses.length
    };
    
  } catch (error) {
    console.error('Error syncing form responses:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 학급 관리 - 학급 생성 및 학생 명단 저장
 * @param {Object} classData - 학급 정보 및 학생 명단
 * @returns {Object} 저장 결과
 */
function saveClassRoster(classData) {
  try {
    const folders = getOrCreateAppFolders();
    const studentFolder = DriveApp.getFolderById(folders.studentFolderId);
    
    // 학급별 폴더 생성
    const classFolder = getOrCreateFolder(classData.className, studentFolder);
    
    // 학급 정보 파일 생성
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `학급명단_${classData.className}_${timestamp}.json`;
    
    const rosterData = {
      className: classData.className,
      grade: classData.grade,
      semester: classData.semester,
      teacher: classData.teacher,
      students: classData.students, // [{number: 1, name: '홍길동'}, ...]
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 기존 파일 확인 및 업데이트
    const files = classFolder.searchFiles(`title contains "학급명단_${classData.className}"`);
    if (files.hasNext()) {
      const file = files.next();
      file.setContent(JSON.stringify(rosterData, null, 2));
      console.log('학급 명단 업데이트:', filename);
    } else {
      const blob = Utilities.newBlob(JSON.stringify(rosterData, null, 2), 'application/json', filename);
      classFolder.createFile(blob);
      console.log('학급 명단 생성:', filename);
    }
    
    return {
      success: true,
      className: classData.className,
      studentCount: classData.students.length
    };
  } catch (error) {
    console.error('Error saving class roster:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 학급 목록 조회
 * @returns {Array} 학급 목록
 */
function getClassList() {
  try {
    let classList = [];
    
    // Method 1: Try new user-specific structure first
    try {
      const userFolders = getUserFolders();
      const personalFolder = DriveApp.getFolderById(userFolders.personalFolderId);
      
      // Look for "학급관리" folder in personal folder
      const classManagementFolders = personalFolder.getFoldersByName('학급관리');
      if (classManagementFolders.hasNext()) {
        console.log('Found 학급관리 folder in new structure');
        const classManagementFolder = classManagementFolders.next();
        classList = getClassListFromFolder(classManagementFolder);
      }
    } catch (newStructureError) {
      console.log('New structure not available:', newStructureError);
    }
    
    // Method 2: If new structure doesn't have data, try old structure
    if (classList.length === 0) {
      try {
        console.log('Trying legacy structure...');
        const mainFolder = getMainAppFolder();
        const studentDataFolders = mainFolder.getFoldersByName('학생자료');
        
        if (studentDataFolders.hasNext()) {
          console.log('Found 학생자료 folder in legacy structure');
          const studentDataFolder = studentDataFolders.next();
          classList = getClassListFromFolder(studentDataFolder);
        }
      } catch (legacyError) {
        console.log('Legacy structure not available:', legacyError);
      }
    }
    
    // Method 3: Direct search as fallback
    if (classList.length === 0) {
      console.log('Trying direct search for class files...');
      classList = getClassListByDirectSearch();
    }
    
    // 학년-반 순으로 정렬
    classList.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return a.className.localeCompare(b.className);
    });
    
    console.log(`Found ${classList.length} classes total`);
    return classList;
  } catch (error) {
    console.error('Error getting class list:', error);
    return [];
  }
}

/**
 * Helper function to get class list from a specific folder
 * @param {Folder} folder - Folder to search for classes
 * @returns {Array} List of classes found in the folder
 */
function getClassListFromFolder(folder) {
  const classList = [];
  
  try {
    const classFolders = folder.getFolders();
    
    while (classFolders.hasNext()) {
      const classFolder = classFolders.next();
      const className = classFolder.getName();
      
      // 학급 명단 파일 찾기
      const files = classFolder.searchFiles('title contains "학급명단_"');
      if (files.hasNext()) {
        const file = files.next();
        try {
          const content = file.getBlob().getDataAsString();
          const data = JSON.parse(content);
          
          classList.push({
            id: classFolder.getId(),
            className: className,
            grade: data.grade,
            semester: data.semester,
            teacher: data.teacher,
            students: data.students, // Include full student data for batch generation
            studentCount: data.students.length,
            updatedAt: data.updatedAt
          });
          
          console.log(`Found class: ${className} with ${data.students.length} students`);
        } catch (parseError) {
          console.error(`Error parsing class file for ${className}:`, parseError);
        }
      }
    }
  } catch (error) {
    console.error('Error scanning folder for classes:', error);
  }
  
  return classList;
}

/**
 * Fallback method to find classes by direct Drive search
 * @returns {Array} List of classes found by search
 */
function getClassListByDirectSearch() {
  const classList = [];
  
  try {
    console.log('Performing direct search for 학급명단_ files...');
    const files = DriveApp.searchFiles('title contains "학급명단_"');
    
    while (files.hasNext()) {
      const file = files.next();
      try {
        const content = file.getBlob().getDataAsString();
        const data = JSON.parse(content);
        
        // Get class folder
        const parents = file.getParents();
        if (parents.hasNext()) {
          const classFolder = parents.next();
          const className = classFolder.getName();
          
          classList.push({
            id: classFolder.getId(),
            className: className,
            grade: data.grade,
            semester: data.semester,
            teacher: data.teacher,
            students: data.students,
            studentCount: data.students.length,
            updatedAt: data.updatedAt
          });
          
          console.log(`Found class by search: ${className} with ${data.students.length} students`);
        }
      } catch (parseError) {
        console.error(`Error parsing class file ${file.getName()}:`, parseError);
      }
    }
  } catch (error) {
    console.error('Error in direct search:', error);
  }
  
  return classList;
}

/**
 * 특정 학급의 학생 명단 조회
 * @param {string} className - 학급명
 * @returns {Object} 학급 정보 및 학생 명단
 */
function getClassRoster(className) {
  try {
    console.log(`Getting roster for class: ${className}`);
    
    // Method 1: Try new user-specific structure first
    try {
      const userFolders = getUserFolders();
      const personalFolder = DriveApp.getFolderById(userFolders.personalFolderId);
      
      const classManagementFolders = personalFolder.getFoldersByName('학급관리');
      if (classManagementFolders.hasNext()) {
        const classManagementFolder = classManagementFolders.next();
        const classFolders = classManagementFolder.getFoldersByName(className);
        
        if (classFolders.hasNext()) {
          console.log('Found class in new structure:', className);
          const classFolder = classFolders.next();
          const files = classFolder.searchFiles('title contains "학급명단_"');
          
          if (files.hasNext()) {
            const file = files.next();
            const content = file.getBlob().getDataAsString();
            const data = JSON.parse(content);
            
            return {
              ...data,
              folderId: classFolder.getId()
            };
          }
        }
      }
    } catch (newStructureError) {
      console.log('New structure not available for class roster:', newStructureError);
    }
    
    // Method 2: Try legacy structure
    try {
      const mainFolder = getMainAppFolder();
      const studentDataFolders = mainFolder.getFoldersByName('학생자료');
      
      if (studentDataFolders.hasNext()) {
        const studentDataFolder = studentDataFolders.next();
        const classFolders = studentDataFolder.getFoldersByName(className);
        
        if (classFolders.hasNext()) {
          console.log('Found class in legacy structure:', className);
          const classFolder = classFolders.next();
          const files = classFolder.searchFiles('title contains "학급명단_"');
          
          if (files.hasNext()) {
            const file = files.next();
            const content = file.getBlob().getDataAsString();
            const data = JSON.parse(content);
            
            return {
              ...data,
              folderId: classFolder.getId()
            };
          }
        }
      }
    } catch (legacyError) {
      console.log('Legacy structure not available for class roster:', legacyError);
    }
    
    // Method 3: Direct search
    try {
      console.log('Trying direct search for class roster...');
      const files = DriveApp.searchFiles(`title contains "학급명단_" and title contains "${className}"`);
      
      if (files.hasNext()) {
        const file = files.next();
        const content = file.getBlob().getDataAsString();
        const data = JSON.parse(content);
        
        // Get class folder
        const parents = file.getParents();
        if (parents.hasNext()) {
          const classFolder = parents.next();
          console.log('Found class by direct search:', className);
          
          return {
            ...data,
            folderId: classFolder.getId()
          };
        }
      }
    } catch (searchError) {
      console.log('Direct search failed for class roster:', searchError);
    }
    
    console.log('No class roster found for:', className);
    return null;
  } catch (error) {
    console.error('Error getting class roster:', error);
    return null;
  }
}

/**
 * 평가 결과 저장
 * @param {Object} evaluationResults - 평가 결과 데이터
 * @returns {Object} 저장 결과
 */
function saveEvaluationResults(evaluationResults) {
  try {
    const { className, evaluationPlanId, evaluationName, results } = evaluationResults;
    
    const folders = getOrCreateAppFolders();
    const studentFolder = DriveApp.getFolderById(folders.studentFolderId);
    
    const classFolders = studentFolder.getFoldersByName(className);
    if (!classFolders.hasNext()) {
      throw new Error('학급을 찾을 수 없습니다.');
    }
    
    const classFolder = classFolders.next();
    
    // 평가 결과 폴더 생성
    const resultsFolder = getOrCreateFolder('평가결과', classFolder);
    
    // 파일명 생성
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `평가결과_${evaluationName}_${timestamp}.json`;
    
    const resultsData = {
      className: className,
      evaluationPlanId: evaluationPlanId,
      evaluationName: evaluationName,
      results: results, // {studentName: {number: 1, result: '매우잘함'}, ...}
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 기존 파일 확인 및 업데이트
    const files = resultsFolder.searchFiles(`title contains "평가결과_${evaluationName}"`);
    if (files.hasNext()) {
      const file = files.next();
      file.setContent(JSON.stringify(resultsData, null, 2));
    } else {
      const blob = Utilities.newBlob(JSON.stringify(resultsData, null, 2), 'application/json', filename);
      resultsFolder.createFile(blob);
    }
    
    return {
      success: true,
      evaluationName: evaluationName,
      resultCount: Object.keys(results).length
    };
  } catch (error) {
    console.error('Error saving evaluation results:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 특정 학급의 평가 결과 조회
 * @param {string} className - 학급명
 * @param {string} evaluationPlanId - 평가계획 ID (선택)
 * @returns {Array} 평가 결과 목록
 */
function getEvaluationResults(className, evaluationPlanId = null) {
  try {
    const folders = getOrCreateAppFolders();
    const studentFolder = DriveApp.getFolderById(folders.studentFolderId);
    
    const classFolders = studentFolder.getFoldersByName(className);
    if (!classFolders.hasNext()) {
      return [];
    }
    
    const classFolder = classFolders.next();
    const resultsFolders = classFolder.getFoldersByName('평가결과');
    if (!resultsFolders.hasNext()) {
      return [];
    }
    
    const resultsFolder = resultsFolders.next();
    const files = resultsFolder.getFilesByType(MimeType.JSON);
    
    const results = [];
    while (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      const data = JSON.parse(content);
      
      if (!evaluationPlanId || data.evaluationPlanId === evaluationPlanId) {
        results.push({
          id: file.getId(),
          name: file.getName(),
          data: data,
          updatedAt: data.updatedAt
        });
      }
    }
    
    // 날짜순 정렬 (최신순)
    results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return results;
  } catch (error) {
    console.error('Error getting evaluation results:', error);
    return [];
  }
}

/**
 * CSV 파일에서 학생 명단 파싱
 * @param {string} csvContent - CSV 파일 내용
 * @returns {Array} 학생 명단 배열
 */
function parseStudentCSV(csvContent) {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const students = [];
    
    // 첫 줄은 헤더로 가정 (번호, 이름)
    for (let i = 1; i < lines.length; i++) {
      const [number, name] = lines[i].split(',').map(item => item.trim());
      if (number && name) {
        students.push({
          number: parseInt(number),
          name: name
        });
      }
    }
    
    return students;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('CSV 파일 형식이 올바르지 않습니다. 번호,이름 형식으로 작성해주세요.');
  }
}

/**
 * 학급 정보 업데이트
 * @param {string} originalClassName - 원래 학급명 (식별용)
 * @param {Object} updatedData - 업데이트할 학급 정보
 * @returns {Object} 업데이트 결과
 */
function updateClassRoster(originalClassName, updatedData) {
  try {
    const folders = getOrCreateAppFolders();
    const studentFolder = DriveApp.getFolderById(folders.studentFolderId);
    
    // Find the class folder
    const classFolders = studentFolder.getFoldersByName(originalClassName);
    if (!classFolders.hasNext()) {
      throw new Error('학급을 찾을 수 없습니다.');
    }
    
    const classFolder = classFolders.next();
    
    // If class name changed, rename the folder
    if (originalClassName !== updatedData.className) {
      classFolder.setName(updatedData.className);
    }
    
    // Update the roster file
    const files = classFolder.searchFiles('title contains "학급명단_"');
    if (!files.hasNext()) {
      throw new Error('학급 명단 파일을 찾을 수 없습니다.');
    }
    
    const file = files.next();
    
    // Create updated roster data
    const rosterData = {
      className: updatedData.className,
      grade: updatedData.grade,
      semester: updatedData.semester,
      teacher: updatedData.teacher,
      students: updatedData.students,
      createdAt: JSON.parse(file.getBlob().getDataAsString()).createdAt, // Keep original creation date
      updatedAt: new Date().toISOString()
    };
    
    // Update file content
    file.setContent(JSON.stringify(rosterData, null, 2));
    
    // Update filename if class name changed
    if (originalClassName !== updatedData.className) {
      const timestamp = new Date().toISOString().split('T')[0];
      const newFilename = `학급명단_${updatedData.className}_${timestamp}.json`;
      file.setName(newFilename);
    }
    
    console.log('학급 정보 업데이트 완료:', updatedData.className);
    
    return {
      success: true,
      className: updatedData.className,
      studentCount: updatedData.students.length
    };
  } catch (error) {
    console.error('Error updating class roster:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 학급 삭제
 * @param {string} className - 삭제할 학급명
 * @returns {Object} 삭제 결과
 */
function deleteClass(className) {
  try {
    const folders = getOrCreateAppFolders();
    const studentFolder = DriveApp.getFolderById(folders.studentFolderId);
    
    // Find the class folder
    const classFolders = studentFolder.getFoldersByName(className);
    if (!classFolders.hasNext()) {
      throw new Error('학급을 찾을 수 없습니다.');
    }
    
    const classFolder = classFolders.next();
    
    // Move to trash (can be recovered from Google Drive trash)
    classFolder.setTrashed(true);
    
    console.log('학급 삭제 완료:', className);
    
    return {
      success: true,
      className: className
    };
  } catch (error) {
    console.error('Error deleting class:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Delete evaluation plan
 * @param {string} planId - The evaluation plan ID to delete
 * @returns {Object} Result
 */
function deleteEvaluationPlan(planId) {
  try {
    console.log('deleteEvaluationPlan called with ID:', planId);
    
    // Get the file
    const file = DriveApp.getFileById(planId);
    
    // Log file name before deletion
    console.log('Deleting evaluation plan:', file.getName());
    
    // Move to trash (can be recovered from Google Drive trash)
    file.setTrashed(true);
    
    console.log('Evaluation plan deleted successfully');
    
    return {
      success: true,
      message: '평가계획이 삭제되었습니다.'
    };
  } catch (error) {
    console.error('Error deleting evaluation plan:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get all classes for batch generation
 * @returns {Array} List of all classes
 */
function getAllClasses() {
  try {
    const classList = getClassList();
    return classList;
  } catch (error) {
    console.error('Error getting all classes:', error);
    return [];
  }
}

// ===== School Code Management System =====

/**
 * Generate unique school code
 * @returns {string} 6-character school code
 */
function generateSchoolCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create new school code group
 * @param {Object} groupData - Group information
 * @returns {Object} Result with school code
 */
function createSchoolCode(groupData) {
  try {
    const userEmail = getCurrentUserEmail();
    let code;
    let attempts = 0;
    
    // Generate unique code (max 10 attempts)
    do {
      code = generateSchoolCode();
      attempts++;
    } while (isSchoolCodeExists(code) && attempts < 10);
    
    if (attempts >= 10) {
      throw new Error('학교 코드 생성에 실패했습니다. 다시 시도해주세요.');
    }
    
    // Create shared folder for this group
    const sharedFolders = getSharedFolders();
    const sharedFolder = DriveApp.getFolderById(sharedFolders.sharedFolderId);
    
    const groupFolderName = `${code}_${groupData.groupName}`;
    const groupFolder = getOrCreateFolder(groupFolderName, sharedFolder);
    
    // Create sub-folders for shared content
    const sharedEvaluationsFolder = getOrCreateFolder(SHARED_EVALUATIONS_FOLDER, groupFolder);
    const sharedClassesFolder = getOrCreateFolder(SHARED_CLASSES_FOLDER, groupFolder);
    const collaborationFolder = getOrCreateFolder(COLLABORATION_FOLDER, groupFolder);
    
    // Create group metadata
    const groupMetadata = {
      code: code,
      groupName: groupData.groupName,
      description: groupData.description || '',
      creator: userEmail,
      createdAt: new Date().toISOString(),
      members: [userEmail],
      permissions: {
        canInvite: groupData.canInvite !== false,
        canShare: groupData.canShare !== false,
        canEdit: groupData.canEdit !== false
      },
      folderId: groupFolder.getId(),
      subFolders: {
        evaluations: sharedEvaluationsFolder.getId(),
        classes: sharedClassesFolder.getId(),
        collaboration: collaborationFolder.getId()
      }
    };
    
    // Save group metadata
    const metadataFile = groupFolder.createFile(
      Utilities.newBlob(JSON.stringify(groupMetadata, null, 2), 'application/json', 'group_metadata.json')
    );
    
    // Add participation record for creator
    addUserParticipation(userEmail, groupMetadata);
    
    console.log('School code created:', code, 'by', userEmail);
    
    return {
      success: true,
      code: code,
      groupName: groupData.groupName,
      folderId: groupFolder.getId()
    };
  } catch (error) {
    console.error('Error creating school code:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check if school code exists
 * @param {string} code - School code to check
 * @returns {boolean} True if exists
 */
function isSchoolCodeExists(code) {
  try {
    const sharedFolders = getSharedFolders();
    const sharedFolder = DriveApp.getFolderById(sharedFolders.sharedFolderId);
    
    const folders = sharedFolder.getFolders();
    while (folders.hasNext()) {
      const folder = folders.next();
      if (folder.getName().startsWith(code + '_')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking school code:', error);
    return false;
  }
}

/**
 * Join school code group
 * @param {string} code - School code to join
 * @returns {Object} Join result
 */
function joinSchoolCode(code) {
  try {
    const userEmail = getCurrentUserEmail();
    
    // Find group folder
    const groupFolder = findGroupFolder(code);
    if (!groupFolder) {
      return {
        success: false,
        error: '유효하지 않은 학교 코드입니다.'
      };
    }
    
    // Get group metadata
    const metadata = getGroupMetadata(groupFolder);
    if (!metadata) {
      return {
        success: false,
        error: '그룹 정보를 찾을 수 없습니다.'
      };
    }
    
    // Check if user is already a member
    if (metadata.members.includes(userEmail)) {
      return {
        success: false,
        error: '이미 참여 중인 그룹입니다.'
      };
    }
    
    // Add user to members
    metadata.members.push(userEmail);
    metadata.updatedAt = new Date().toISOString();
    
    // Update metadata file
    updateGroupMetadata(groupFolder, metadata);
    
    // Add participation record for user
    addUserParticipation(userEmail, metadata);
    
    console.log('User joined group:', userEmail, 'to', code);
    
    return {
      success: true,
      code: code,
      groupName: metadata.groupName,
      memberCount: metadata.members.length
    };
  } catch (error) {
    console.error('Error joining school code:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get user's participated groups
 * @returns {Array} List of participated groups
 */
function getUserGroups() {
  try {
    const userFolders = getUserFolders();
    const participationFolder = DriveApp.getFolderById(userFolders.participationFolderId);
    
    const files = participationFolder.getFilesByType(MimeType.JSON);
    const groups = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      const groupData = JSON.parse(content);
      
      // Verify group still exists
      const groupFolder = findGroupFolder(groupData.code);
      if (groupFolder) {
        const currentMetadata = getGroupMetadata(groupFolder);
        if (currentMetadata && currentMetadata.members.includes(userFolders.userEmail)) {
          groups.push({
            ...groupData,
            memberCount: currentMetadata.members.length,
            isCreator: currentMetadata.creator === userFolders.userEmail
          });
        }
      }
    }
    
    // Sort by join date (newest first)
    groups.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
    
    return groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

/**
 * Get group members
 * @param {string} code - School code
 * @returns {Array} List of group members
 */
function getGroupMembers(code) {
  try {
    const groupFolder = findGroupFolder(code);
    if (!groupFolder) {
      return {
        success: false,
        error: '그룹을 찾을 수 없습니다.'
      };
    }
    
    const metadata = getGroupMetadata(groupFolder);
    if (!metadata) {
      return {
        success: false,
        error: '그룹 정보를 찾을 수 없습니다.'
      };
    }
    
    const userEmail = getCurrentUserEmail();
    if (!metadata.members.includes(userEmail)) {
      return {
        success: false,
        error: '그룹 멤버만 조회할 수 있습니다.'
      };
    }
    
    // Return member list with anonymized emails for privacy
    const members = metadata.members.map(email => ({
      email: email === userEmail ? email : email.replace(/(.{2}).*@/, '$1***@'),
      isCreator: email === metadata.creator,
      isCurrentUser: email === userEmail
    }));
    
    return {
      success: true,
      code: code,
      groupName: metadata.groupName,
      members: members,
      isCreator: metadata.creator === userEmail
    };
  } catch (error) {
    console.error('Error getting group members:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Leave school code group
 * @param {string} code - School code to leave
 * @returns {Object} Leave result
 */
function leaveSchoolCode(code) {
  try {
    const userEmail = getCurrentUserEmail();
    
    const groupFolder = findGroupFolder(code);
    if (!groupFolder) {
      return {
        success: false,
        error: '그룹을 찾을 수 없습니다.'
      };
    }
    
    const metadata = getGroupMetadata(groupFolder);
    if (!metadata) {
      return {
        success: false,
        error: '그룹 정보를 찾을 수 없습니다.'
      };
    }
    
    // Check if user is a member
    if (!metadata.members.includes(userEmail)) {
      return {
        success: false,
        error: '참여하지 않은 그룹입니다.'
      };
    }
    
    // Creators cannot leave their own group
    if (metadata.creator === userEmail) {
      return {
        success: false,
        error: '그룹 생성자는 탈퇴할 수 없습니다. 그룹을 삭제해주세요.'
      };
    }
    
    // Remove user from members
    metadata.members = metadata.members.filter(email => email !== userEmail);
    metadata.updatedAt = new Date().toISOString();
    
    // Update metadata
    updateGroupMetadata(groupFolder, metadata);
    
    // Remove participation record
    removeUserParticipation(userEmail, code);
    
    console.log('User left group:', userEmail, 'from', code);
    
    return {
      success: true,
      code: code,
      groupName: metadata.groupName
    };
  } catch (error) {
    console.error('Error leaving school code:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Helper functions for school code management

/**
 * Find group folder by code
 * @param {string} code - School code
 * @returns {DriveApp.Folder} Group folder or null
 */
function findGroupFolder(code) {
  try {
    const sharedFolders = getSharedFolders();
    const sharedFolder = DriveApp.getFolderById(sharedFolders.sharedFolderId);
    
    const folders = sharedFolder.getFolders();
    while (folders.hasNext()) {
      const folder = folders.next();
      if (folder.getName().startsWith(code + '_')) {
        return folder;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding group folder:', error);
    return null;
  }
}

/**
 * Get group metadata
 * @param {DriveApp.Folder} groupFolder - Group folder
 * @returns {Object} Group metadata or null
 */
function getGroupMetadata(groupFolder) {
  try {
    const files = groupFolder.getFilesByName('group_metadata.json');
    if (!files.hasNext()) {
      return null;
    }
    
    const file = files.next();
    const content = file.getBlob().getDataAsString();
    return JSON.parse(content);
  } catch (error) {
    console.error('Error getting group metadata:', error);
    return null;
  }
}

/**
 * Update group metadata
 * @param {DriveApp.Folder} groupFolder - Group folder
 * @param {Object} metadata - Updated metadata
 */
function updateGroupMetadata(groupFolder, metadata) {
  try {
    const files = groupFolder.getFilesByName('group_metadata.json');
    if (files.hasNext()) {
      const file = files.next();
      file.setContent(JSON.stringify(metadata, null, 2));
    }
  } catch (error) {
    console.error('Error updating group metadata:', error);
  }
}

/**
 * Add user participation record
 * @param {string} userEmail - User email
 * @param {Object} groupMetadata - Group metadata
 */
function addUserParticipation(userEmail, groupMetadata) {
  try {
    const userFolders = getUserFolders();
    const participationFolder = DriveApp.getFolderById(userFolders.participationFolderId);
    
    const participationData = {
      code: groupMetadata.code,
      groupName: groupMetadata.groupName,
      description: groupMetadata.description,
      joinedAt: new Date().toISOString(),
      isCreator: groupMetadata.creator === userEmail
    };
    
    const filename = `${groupMetadata.code}_${groupMetadata.groupName}.json`;
    const blob = Utilities.newBlob(JSON.stringify(participationData, null, 2), 'application/json', filename);
    participationFolder.createFile(blob);
  } catch (error) {
    console.error('Error adding user participation:', error);
  }
}

/**
 * Remove user participation record
 * @param {string} userEmail - User email
 * @param {string} code - School code
 */
function removeUserParticipation(userEmail, code) {
  try {
    const userFolders = getUserFolders();
    const participationFolder = DriveApp.getFolderById(userFolders.participationFolderId);
    
    const files = participationFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().startsWith(code + '_')) {
        file.setTrashed(true);
        break;
      }
    }
  } catch (error) {
    console.error('Error removing user participation:', error);
  }
}

/**
 * Get group details including members
 * @param {string} code - School code
 * @returns {Object} Group details with members
 */
function getGroupDetails(code) {
  try {
    const userEmail = getCurrentUserEmail();
    const { sharedFolder } = getUserFolders();
    
    // Find group folder
    const groupFolders = sharedFolder.getFolders();
    let groupFolder = null;
    
    while (groupFolders.hasNext()) {
      const folder = groupFolders.next();
      if (folder.getName().startsWith(code + '_')) {
        groupFolder = folder;
        break;
      }
    }
    
    if (!groupFolder) {
      return { success: false, error: '그룹을 찾을 수 없습니다.' };
    }
    
    // Get metadata
    const metadataFiles = groupFolder.getFilesByName('metadata.json');
    if (!metadataFiles.hasNext()) {
      return { success: false, error: '그룹 메타데이터를 찾을 수 없습니다.' };
    }
    
    const metadataFile = metadataFiles.next();
    const metadata = JSON.parse(metadataFile.getBlob().getDataAsString());
    
    // Get members with details
    const members = metadata.members.map(memberEmail => {
      return {
        email: memberEmail,
        name: memberEmail.split('@')[0], // Simplified - could be enhanced
        isCreator: memberEmail === metadata.createdBy
      };
    });
    
    // Get shared plans count
    try {
      const plansFolders = groupFolder.getFoldersByName('shared_plans');
      let planCount = 0;
      if (plansFolders.hasNext()) {
        const plansFolder = plansFolders.next();
        const sharedPlans = plansFolder.getFiles();
        while (sharedPlans.hasNext()) {
          sharedPlans.next();
          planCount++;
        }
      }
      
      const result = {
        ...metadata,
        members: members,
        sharedPlans: planCount
      };
      
      return { success: true, data: result };
    } catch (planError) {
      // If shared plans folder doesn't exist, just return 0 count
      const result = {
        ...metadata,
        members: members,
        sharedPlans: 0
      };
      
      return { success: true, data: result };
    }
  } catch (error) {
    console.error('Error getting group details:', error);
    return { success: false, error: error.toString() };
  }
}