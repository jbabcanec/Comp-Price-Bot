import { CONFIDENCE_LEVELS, FILE_TYPE_LABELS } from './constants';

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get confidence level based on score
 * @param {number} score - Confidence score (0-1)
 * @returns {object} Confidence level object
 */
export const getConfidenceLevel = (score) => {
  if (score >= CONFIDENCE_LEVELS.HIGH.threshold) return CONFIDENCE_LEVELS.HIGH;
  if (score >= CONFIDENCE_LEVELS.MEDIUM.threshold) return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
};

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

/**
 * Get file type label from filename
 * @param {string} filename - File name
 * @returns {string} File type label
 */
export const getFileTypeLabel = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  return FILE_TYPE_LABELS[extension] || 'Unknown';
};

/**
 * Validate file type
 * @param {string} filename - File name to validate
 * @param {string} acceptedTypes - Comma-separated accepted file extensions
 * @returns {boolean} Whether file type is valid
 */
export const isValidFileType = (filename, acceptedTypes) => {
  const extension = filename.split('.').pop().toLowerCase();
  const accepted = acceptedTypes.split(',').map(type => type.trim().replace('.', ''));
  return accepted.includes(extension);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};