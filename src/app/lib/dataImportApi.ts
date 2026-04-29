/**
 * Data Import API Client
 * 
 * Handles all data import operations including:
 * - File detection
 * - Validation
 * - Upload
 */

import axios, { AxiosProgressEvent } from 'axios';

export interface ValidateResult {
  file_type: string;
  is_valid: boolean;
  structure_errors: ValidationError[];
  row_errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    row_errors_count: number;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  type: 'structure' | 'data';
  row?: number;
  column?: string;
  position?: number;
  expected?: string;
  actual?: string;
}

export interface ValidationWarning {
  message: string;
  type: 'warning';
  rows_skipped?: number;
}

export interface DetectResult {
  filename: string;
  detected_file_type: string;
  headers: string[];
  preview_rows: Record<string, string>[];
  total_rows_estimate: number;
}

export interface ImportResult {
  message: string;
  import_log: {
    id: string;
    file_type: string;
    status: string;
    row_count: number;
    success_count: number;
    error_count: number;
    error_details: any[];
  };
  result: {
    file_type: string;
    total_rows: number;
    created: number;
    updated: number;
    errors: any[];
    [key: string]: any;
  };
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://fasi-backend.onrender.com/api';
const IMPORT_BASE = `${API_BASE}/import`;
const axiosImport = axios.create();

/**
 * Data Import API methods
 */
export const dataImportApi = {
  /**
   * Detect file type and get preview without validation
   */
  async detectFile(file: File): Promise<DetectResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosImport.post<DetectResult>(
      `${IMPORT_BASE}/detect/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Validate file against template WITHOUT importing
   * Returns detailed validation errors and warnings
   */
  async validateFile(
    file: File,
    fileType?: string
  ): Promise<{ validation: ValidateResult; can_import: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    if (fileType) {
      formData.append('file_type', fileType);
    }

    const response = await axiosImport.post<{
      filename: string;
      validation: ValidateResult;
      can_import: boolean;
    }>(`${IMPORT_BASE}/validate/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      validation: response.data.validation,
      can_import: response.data.can_import,
    };
  },

  /**
   * Upload and import file
   * File is validated before processing
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
    fileType?: string
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (fileType) {
      formData.append('file_type', fileType);
    }

    const token = localStorage.getItem('fasi_access_token');
    const response = await axiosImport.post<ImportResult>(
      `${IMPORT_BASE}/upload/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            onProgress?.(progress);
          }
        },
      }
    );

    return response.data;
  },
};

/**
 * Format validation errors for display
 */
export function formatValidationError(error: ValidationError): string {
  if (error.type === 'structure') {
    if (error.position !== undefined) {
      return `Column ${error.position}: ${error.message}`;
    }
    return error.message;
  }

  if (error.type === 'data') {
    if (error.row && error.column) {
      return `Row ${error.row}, Column "${error.column}": ${error.message}`;
    }
    return error.message;
  }

  return error.message;
}

/**
 * Group validation errors by type
 */
export function groupValidationErrors(errors: ValidationError[]): {
  structure: ValidationError[];
  data: ValidationError[];
} {
  return {
    structure: errors.filter((e) => e.type === 'structure'),
    data: errors.filter((e) => e.type === 'data'),
  };
}

/**
 * Check if validation result has critical issues
 */
export function hasValidationBlockers(validation: ValidateResult): boolean {
  return validation.structure_errors.length > 0;
}

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(validation: ValidateResult): string {
  const { summary } = validation;
  
  if (validation.structure_errors.length > 0) {
    return `File structure error: Template mismatch (${validation.structure_errors.length} issue${validation.structure_errors.length > 1 ? 's' : ''})`;
  }

  if (summary.invalid_rows > 0) {
    const percentage = Math.round(
      (summary.invalid_rows / summary.total_rows) * 100
    );
    return `${summary.invalid_rows} of ${summary.total_rows} rows have validation errors (${percentage}%)`;
  }

  return `All ${summary.total_rows} rows are valid ✓`;
}
