import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Fade,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Cancel as CancelIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  abortController?: AbortController;
}

interface FloatingUploadProgressProps {
  uploads: UploadItem[];
  onCancelUpload: (id: string) => void;
  onClearCompleted: () => void;
  onClose: () => void;
}

const FloatingUploadProgress: React.FC<FloatingUploadProgressProps> = ({
  uploads,
  onCancelUpload,
  onClearCompleted,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  
  // Auto-show the component when new uploads are added
  useEffect(() => {
    const hasActiveUploads = uploads.some(u => u.status === 'uploading' || u.status === 'pending');
    if (hasActiveUploads && !isVisible) {
      console.log('New active uploads detected, showing FloatingUploadProgress');
      setIsVisible(true);
    }
  }, [uploads, isVisible]);
  
  console.log('FloatingUploadProgress render - uploads:', uploads.length, 'visible:', isVisible);
  console.log('Uploads in FloatingProgress:', uploads.map(u => ({
    id: u.id,
    fileName: u.fileName,
    status: u.status,
    progress: u.progress
  })));

  // Show the component if there are ANY uploads (even completed ones initially)
  const shouldShow = isVisible && uploads.length > 0;
  
  if (!shouldShow) {
    console.log('FloatingUploadProgress not showing - visible:', isVisible, 'uploads:', uploads.length);
    return null;
  }

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const errorUploads = uploads.filter(u => u.status === 'error');
  const cancelledUploads = uploads.filter(u => u.status === 'cancelled');

  const totalProgress = activeUploads.length > 0
    ? activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length
    : 100;

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'cancelled':
        return <CloseIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getUploadSummary = () => {
    if (activeUploads.length > 0) {
      return `Uploading ${activeUploads.length} file${activeUploads.length > 1 ? 's' : ''}`;
    }
    if (completedUploads.length > 0 && errorUploads.length === 0) {
      return `${completedUploads.length} upload${completedUploads.length > 1 ? 's' : ''} completed`;
    }
    if (errorUploads.length > 0) {
      return `${errorUploads.length} upload${errorUploads.length > 1 ? 's' : ''} failed`;
    }
    return 'No active uploads';
  };

  return (
    <Fade in={isVisible}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 400,
          maxWidth: '90vw',
          maxHeight: '60vh',
          zIndex: 1300,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon />
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {getUploadSummary()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {activeUploads.length > 0 && (
              <Typography variant="caption" sx={{ mr: 2 }}>
                {Math.round(totalProgress)}%
              </Typography>
            )}
            <IconButton
              size="small"
              sx={{ color: 'primary.contrastText' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: 'primary.contrastText' }}
              onClick={(e) => {
                e.stopPropagation();
                // Only allow closing if no active uploads
                const hasActiveUploads = uploads.some(u => u.status === 'uploading' || u.status === 'pending');
                if (!hasActiveUploads) {
                  setIsVisible(false);
                  // Clear completed uploads when closing
                  onClearCompleted();
                  onClose();
                } else {
                  console.log('Cannot close while uploads are in progress');
                  // Optionally minimize instead of closing
                  setIsExpanded(false);
                }
              }}
              title={activeUploads.length > 0 ? 'Minimize (uploads in progress)' : 'Close'}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Overall Progress Bar */}
        {activeUploads.length > 0 && (
          <LinearProgress
            variant="determinate"
            value={totalProgress}
            sx={{
              height: 3,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
              },
            }}
          />
        )}

        {/* Upload List */}
        <Collapse in={isExpanded}>
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            <List sx={{ py: 0 }}>
              {/* Active and Pending Uploads */}
              {activeUploads.map((upload) => (
                <ListItem
                  key={upload.id}
                  divider
                  sx={{
                    py: 1.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {upload.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(upload.fileSize)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={upload.progress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'grey.300',
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {upload.status === 'pending' ? 'Waiting...' : `${upload.progress}%`}
                          </Typography>
                          {upload.status === 'uploading' && (
                            <Typography variant="caption" color="text.secondary">
                              Uploading...
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onCancelUpload(upload.id)}
                      title="Cancel upload"
                    >
                      <CancelIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}

              {/* Completed Uploads */}
              {completedUploads.map((upload) => (
                <ListItem
                  key={upload.id}
                  divider
                  sx={{
                    py: 1,
                    opacity: 0.8,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(upload.status)}
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {upload.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(upload.fileSize)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}

              {/* Error Uploads */}
              {errorUploads.map((upload) => (
                <ListItem
                  key={upload.id}
                  divider
                  sx={{
                    py: 1,
                    bgcolor: 'error.light',
                    '&:hover': {
                      bgcolor: 'error.light',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(upload.status)}
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {upload.fileName}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="error.dark">
                        {upload.error || 'Upload failed'}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onCancelUpload(upload.id)}
                      title="Remove"
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}

              {/* Cancelled Uploads */}
              {cancelledUploads.map((upload) => (
                <ListItem
                  key={upload.id}
                  divider
                  sx={{
                    py: 1,
                    opacity: 0.6,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(upload.status)}
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {upload.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cancelled
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {/* Clear Completed Button */}
            {(completedUploads.length > 0 || errorUploads.length > 0 || cancelledUploads.length > 0) && (
              <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'primary.main',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                  onClick={onClearCompleted}
                >
                  Clear completed
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Fade>
  );
};

export default FloatingUploadProgress;