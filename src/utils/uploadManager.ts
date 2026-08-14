import { UploadItem } from '../FloatingUploadProgress';

export interface UploadManagerOptions {
  onProgressUpdate: (uploads: UploadItem[]) => void;
  onUploadComplete: (id: string) => void;
  onUploadError: (id: string, error: string) => void;
  onUploadCancelled: (id: string) => void;
}

class UploadManager {
  private uploads: Map<string, UploadItem> = new Map();
  private options: UploadManagerOptions;
  private uploadQueue: string[] = [];
  private activeUploads = 0;
  private maxConcurrentUploads = 2;

  constructor(options: UploadManagerOptions) {
    this.options = options;
  }

  generateUploadId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  addUpload(file: File): string {
    const id = this.generateUploadId();
    const abortController = new AbortController();
    
    const uploadItem: UploadItem = {
      id,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'pending',
      abortController,
    };

    this.uploads.set(id, uploadItem);
    this.notifyProgressUpdate();
    
    // Don't add to queue here, let the caller handle it
    // The queue processing will be triggered by processUploadQueue
    
    return id;
  }

  async processQueue() {
    while (this.uploadQueue.length > 0 && this.activeUploads < this.maxConcurrentUploads) {
      const uploadId = this.uploadQueue.shift();
      if (uploadId) {
        const upload = this.uploads.get(uploadId);
        if (upload && upload.status === 'pending') {
          // Don't increment here, let startUpload handle it
          this.startUpload(uploadId);
        }
      }
    }
  }

  private async startUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    // Update status to uploading
    upload.status = 'uploading';
    this.notifyProgressUpdate();

    // This will be called from the actual upload implementation
    // The upload function will use the abortController.signal
  }

  updateProgress(uploadId: string, progress: number) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.progress = Math.min(Math.max(0, progress), 100);
      this.notifyProgressUpdate();
    }
  }

  completeUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.status = 'completed';
      upload.progress = 100;
      this.activeUploads--;
      this.notifyProgressUpdate();
      this.options.onUploadComplete(uploadId);
      this.processQueue(); // Process next in queue
    }
  }

  errorUpload(uploadId: string, error: string) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.status = 'error';
      upload.error = error;
      this.activeUploads--;
      this.notifyProgressUpdate();
      this.options.onUploadError(uploadId, error);
      this.processQueue(); // Process next in queue
    }
  }

  cancelUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      // Abort the upload if it's in progress
      if (upload.abortController && (upload.status === 'uploading' || upload.status === 'pending')) {
        // Store the original status before changing it
        const wasUploading = upload.status === 'uploading';
        
        upload.abortController.abort();
        upload.status = 'cancelled';
        
        // Remove from queue if pending
        const queueIndex = this.uploadQueue.indexOf(uploadId);
        if (queueIndex > -1) {
          this.uploadQueue.splice(queueIndex, 1);
        }
        
        // Decrease active uploads if it was uploading
        if (wasUploading) {
          this.activeUploads--;
        }
        
        this.notifyProgressUpdate();
        this.options.onUploadCancelled(uploadId);
        this.processQueue(); // Process next in queue
      } else if (upload.status === 'completed' || upload.status === 'error' || upload.status === 'cancelled') {
        // Just remove from list if already finished
        this.uploads.delete(uploadId);
        this.notifyProgressUpdate();
      }
    }
  }

  clearCompleted() {
    const uploadsArray = Array.from(this.uploads.values());
    uploadsArray.forEach(upload => {
      if (upload.status === 'completed' || upload.status === 'error' || upload.status === 'cancelled') {
        this.uploads.delete(upload.id);
      }
    });
    this.notifyProgressUpdate();
  }

  getUpload(uploadId: string): UploadItem | undefined {
    return this.uploads.get(uploadId);
  }

  getAllUploads(): UploadItem[] {
    return Array.from(this.uploads.values());
  }

  private notifyProgressUpdate() {
    this.options.onProgressUpdate(this.getAllUploads());
  }

  setUploadStatus(uploadId: string, status: UploadItem['status']) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      const previousStatus = upload.status;
      upload.status = status;
      
      // Only increment if transitioning from pending to uploading
      if (status === 'uploading' && previousStatus === 'pending') {
        this.activeUploads++;
      }
      
      this.notifyProgressUpdate();
    }
  }

  reset() {
    // Cancel all active uploads
    this.uploads.forEach(upload => {
      if (upload.abortController && upload.status === 'uploading') {
        upload.abortController.abort();
      }
    });
    
    this.uploads.clear();
    this.uploadQueue = [];
    this.activeUploads = 0;
    this.notifyProgressUpdate();
  }
}

export default UploadManager;