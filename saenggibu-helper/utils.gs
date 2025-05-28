/**
 * Utility functions for the Saenggibu Helper app
 * Common helper functions and utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize user input
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (!input) return '';
  
  // Remove potentially harmful characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim() // Remove leading/trailing whitespace
    .substring(0, 1000); // Limit length
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateKorean(date) {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  };
  
  return new Intl.DateTimeFormat('ko-KR', options).format(date);
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateUniqueId() {
  return Utilities.getUuid();
}

/**
 * Check if user has permission to access the app
 * @returns {boolean} Whether user has permission
 */
function checkUserPermission() {
  try {
    const email = Session.getActiveUser().getEmail();
    
    // If no email, user is not logged in
    if (!email) {
      return false;
    }
    
    // Check if email domain is allowed (optional)
    // const allowedDomains = ['example.com', 'school.ac.kr'];
    // const domain = email.split('@')[1];
    // return allowedDomains.includes(domain);
    
    return true; // Allow all authenticated users
    
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Log activity for monitoring
 * @param {string} action - Action performed
 * @param {Object} details - Additional details
 */
function logActivity(action, details = {}) {
  try {
    const timestamp = new Date();
    const user = Session.getActiveUser().getEmail() || 'anonymous';
    
    console.log({
      timestamp: timestamp.toISOString(),
      user: user,
      action: action,
      details: details
    });
    
  } catch (error) {
    // Silently fail - logging should not break the app
    console.error('Logging error:', error);
  }
}

/**
 * Get app configuration
 * @returns {Object} App configuration
 */
function getAppConfig() {
  return {
    appName: '생기부 도우미',
    version: '1.0.0',
    maxHistoryItems: 50,
    maxInputLength: 1000,
    supportedSubjects: [
      '국어', '수학', '영어', '과학', '사회',
      '체육', '음악', '미술', '기술·가정', '정보',
      '진로', '창의적체험활동', '자율활동', '동아리활동', '봉사활동'
    ]
  };
}

/**
 * Validate Saenggibu content
 * @param {string} content - Content to validate
 * @returns {Object} Validation result
 */
function validateSaenggibuContent(content) {
  const errors = [];
  
  // Check length
  if (content.length < 50) {
    errors.push('내용이 너무 짧습니다. (최소 50자)');
  }
  
  if (content.length > 500) {
    errors.push('내용이 너무 깁니다. (최대 500자)');
  }
  
  // Check for prohibited words
  const prohibitedWords = ['최고', '최상', '완벽', '탁월'];
  prohibitedWords.forEach(word => {
    if (content.includes(word)) {
      errors.push(`"${word}"와 같은 과도한 표현은 사용하지 않는 것이 좋습니다.`);
    }
  });
  
  // Check for required elements
  const requiredElements = ['활동', '참여', '노력', '성장'];
  const hasRequiredElement = requiredElements.some(element => content.includes(element));
  
  if (!hasRequiredElement) {
    errors.push('학생의 활동이나 성장 과정이 명확히 드러나지 않습니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Load history (placeholder for compatibility)
 * @returns {Array} Empty history array
 */
function loadHistory() {
  // This is a placeholder function for compatibility
  // Actual history is managed through evaluation plans and generated content
  return [];
}

/**
 * Clear history (placeholder for compatibility)
 */
function clearHistory() {
  // This is a placeholder function for compatibility
  console.log('Clear history called - no action taken');
}

/**
 * Save to history (placeholder for compatibility)
 * @param {string} input - Input data
 * @param {Object} results - Results data
 */
function saveToHistory(input, results) {
  // This is a placeholder function for compatibility
  console.log('Save to history called - no action taken');
}

/**
 * Get or create history sheet (placeholder for compatibility)
 * @returns {Object} Null placeholder
 */
function getOrCreateHistorySheet() {
  // This is a placeholder function for compatibility
  console.log('getOrCreateHistorySheet called - returning null');
  return null;
}

/**
 * Create a backup of user data
 * @returns {Object} Backup result
 */
function createBackup() {
  try {
    const history = loadHistory();
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      user: getUserEmail(),
      data: history
    };
    
    // Create backup file
    const fileName = `생기부도우미_백업_${new Date().toISOString().split('T')[0]}.json`;
    const blob = Utilities.newBlob(JSON.stringify(backupData, null, 2), 'application/json', fileName);
    
    const file = DriveApp.createFile(blob);
    const folders = getOrCreateAppFolders();
    const folder = DriveApp.getFolderById(folders.mainFolderId);
    
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    
    return {
      success: true,
      fileId: file.getId(),
      fileName: fileName,
      url: file.getUrl()
    };
    
  } catch (error) {
    console.error('Error creating backup:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Restore from backup
 * @param {string} fileId - Backup file ID
 * @returns {Object} Restore result
 */
function restoreFromBackup(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    const backupData = JSON.parse(content);
    
    // Validate backup format
    if (!backupData.version || !backupData.data) {
      throw new Error('잘못된 백업 파일 형식입니다.');
    }
    
    // Since we're using placeholder functions, just return success
    return {
      success: true,
      message: `백업 파일이 확인되었습니다. (${backupData.data.length}개 항목)`
    };
    
  } catch (error) {
    console.error('Error restoring backup:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}