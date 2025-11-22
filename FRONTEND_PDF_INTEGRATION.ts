// Frontend PDF Processing Integration Examples

// ============================================================================
// 1. PDF Upload Component Example
// ============================================================================

import React, { useState } from 'react';

export const PDFUploadComponent = ({ onFileUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large (max 50MB)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        onFileUploaded({
          fileUrl: data.fileUrl,
          filename: data.filename,
          size: data.size,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pdf-upload">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

// ============================================================================
// 2. PDF Processing Service
// ============================================================================

export class PDFProcessingService {
  private baseUrl = '';

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Upload PDF file
   */
  async uploadPDF(file: File): Promise<{
    fileUrl: string;
    filename: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload/pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload PDF');
    }

    const data = await response.json();
    return data;
  }

  /**
   * Process PDF and generate AI content
   */
  async processPDF(
    resourceId: string,
    pdfPath: string
  ): Promise<{
    success: boolean;
    extractedText: string;
    summary: string;
    keyPoints: string[];
    flashcards: Array<{ question: string; answer: string }>;
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/resources/${resourceId}/process-pdf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfPath }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to process PDF');
    }

    return await response.json();
  }

  /**
   * Retrieve stored summary
   */
  async getSummary(resourceId: string): Promise<{
    summary: string;
    keyPoints: string[];
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/resources/${resourceId}/summary`
    );

    if (!response.ok) {
      throw new Error('Summary not found');
    }

    return await response.json();
  }

  /**
   * Retrieve stored flashcards
   */
  async getFlashcards(
    resourceId: string
  ): Promise<{
    flashcards: Array<{ question: string; answer: string }>;
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/resources/${resourceId}/flashcards`
    );

    if (!response.ok) {
      throw new Error('Flashcards not found');
    }

    return await response.json();
  }

  /**
   * Retrieve extracted content
   */
  async getExtractedContent(resourceId: string): Promise<{
    content: string;
    content_type: string;
    extracted_at: string;
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/resources/${resourceId}/extracted-content`
    );

    if (!response.ok) {
      throw new Error('Extracted content not found');
    }

    return await response.json();
  }
}

// ============================================================================
// 3. Complete Workflow Component
// ============================================================================

import React, { useState } from 'react';

export const PDFWorkflowComponent = ({ resourceId }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload');
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [aiContent, setAIContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pdfService = new PDFProcessingService();

  const handleFileUploaded = async (uploadData) => {
    setPdfPath(uploadData.fileUrl);
    setStep('processing');
    setLoading(true);
    setError(null);

    try {
      const content = await pdfService.processPDF(resourceId, uploadData.fileUrl);
      setAIContent(content);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-workflow">
      {step === 'upload' && (
        <div className="upload-section">
          <h2>Upload PDF</h2>
          <PDFUploadComponent onFileUploaded={handleFileUploaded} />
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {step === 'processing' && (
        <div className="processing-section">
          <h2>Processing PDF...</h2>
          <p>Extracting text and generating AI content...</p>
          <div className="spinner"></div>
        </div>
      )}

      {step === 'complete' && aiContent && (
        <div className="complete-section">
          <h2>✓ PDF Processed Successfully</h2>

          <div className="summary-section">
            <h3>Summary</h3>
            <p>{aiContent.summary}</p>
          </div>

          <div className="key-points-section">
            <h3>Key Points</h3>
            <ul>
              {aiContent.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="flashcards-section">
            <h3>Flashcards</h3>
            <div className="flashcards-list">
              {aiContent.flashcards.map((card, index) => (
                <div key={index} className="flashcard">
                  <div className="question">Q: {card.question}</div>
                  <div className="answer">A: {card.answer}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setStep('upload')}>Upload Another PDF</button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. Hook for PDF Processing
// ============================================================================

import { useState, useCallback } from 'react';

export const usePDFProcessing = (resourceId: string) => {
  const [state, setState] = useState<{
    isLoading: boolean;
    error: string | null;
    aiContent: any | null;
    progress: number;
  }>({
    isLoading: false,
    error: null,
    aiContent: null,
    progress: 0,
  });

  const pdfService = new PDFProcessingService();

  const uploadAndProcess = useCallback(
    async (file: File) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Upload step
        setState((prev) => ({ ...prev, progress: 20 }));
        const uploadData = await pdfService.uploadPDF(file);

        // Process step
        setState((prev) => ({ ...prev, progress: 50 }));
        const content = await pdfService.processPDF(
          resourceId,
          uploadData.fileUrl
        );

        setState((prev) => ({
          ...prev,
          progress: 100,
          aiContent: content,
          isLoading: false,
        }));

        return content;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
          progress: 0,
        }));
        throw err;
      }
    },
    [resourceId]
  );

  const getSummary = useCallback(async () => {
    try {
      return await pdfService.getSummary(resourceId);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to get summary',
      }));
      throw err;
    }
  }, [resourceId]);

  const getFlashcards = useCallback(async () => {
    try {
      return await pdfService.getFlashcards(resourceId);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to get flashcards',
      }));
      throw err;
    }
  }, [resourceId]);

  return {
    ...state,
    uploadAndProcess,
    getSummary,
    getFlashcards,
  };
};

// ============================================================================
// 5. Usage Examples
// ============================================================================

/**
 * Example 1: Simple Upload
 */
const example1 = async () => {
  const service = new PDFProcessingService();
  const file = /* ... file input ... */;

  try {
    const uploadData = await service.uploadPDF(file);
    console.log('Uploaded to:', uploadData.fileUrl);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

/**
 * Example 2: Complete Processing
 */
const example2 = async () => {
  const service = new PDFProcessingService();
  const file = /* ... file input ... */;
  const resourceId = 'resource-uuid-here';

  try {
    // Upload
    const uploadData = await service.uploadPDF(file);

    // Process
    const aiContent = await service.processPDF(resourceId, uploadData.fileUrl);

    console.log('Summary:', aiContent.summary);
    console.log('Key Points:', aiContent.keyPoints);
    console.log('Flashcards:', aiContent.flashcards);
  } catch (error) {
    console.error('Error:', error);
  }
};

/**
 * Example 3: Using Hook in Component
 */
const MyPDFComponent = ({ resourceId }: { resourceId: string }) => {
  const { isLoading, error, aiContent, uploadAndProcess } =
    usePDFProcessing(resourceId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAndProcess(file);
      } catch (err) {
        // Error already in state
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {isLoading && <p>Processing...</p>}
      {error && <p className="error">{error}</p>}
      {aiContent && (
        <div>
          <h3>Summary</h3>
          <p>{aiContent.summary}</p>
          {/* ... render more content ... */}
        </div>
      )}
    </div>
  );
};

export default MyPDFComponent;
