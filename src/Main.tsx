import { Home as HomeIcon } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  Snackbar,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";

import FileGrid, { encodeKey, FileItem, isDirectory } from "./FileGrid";
import FileList from "./FileList";
import MultiSelectToolbar from "./MultiSelectToolbar";
import UploadDrawer, { UploadFab } from "./UploadDrawer";
import {
  copyPaste,
  fetchPath,
  invalidateListings,
  processUploadQueue,
  uploadQueue,
} from "./app/transfer";
import { enhancedSearch } from "./utils/fuzzySearch";
import { getAuthHeaders } from "./utils/auth";
import FloatingUploadProgress, { UploadItem } from "./FloatingUploadProgress";
import UploadManager from "./utils/uploadManager";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      {children}
    </Box>
  );
}

function PathBreadcrumb({
  path,
  onCwdChange,
}: {
  path: string;
  onCwdChange: (newCwd: string) => void;
}) {
  const parts = path.replace(/\/$/, "").split("/");

  return (
    <Breadcrumbs separator="›" sx={{ padding: 1 }}>
      <Button
        onClick={() => onCwdChange("")}
        sx={{
          minWidth: 0,
          padding: 0,
        }}
      >
        <HomeIcon />
      </Button>
      {parts.map((part, index) =>
        index === parts.length - 1 ? (
          <Typography key={index} color="text.primary">
            {part}
          </Typography>
        ) : (
          <Link
            key={index}
            component="button"
            onClick={() => {
              onCwdChange(parts.slice(0, index + 1).join("/") + "/");
            }}
          >
            {part}
          </Link>
        )
      )}
    </Breadcrumbs>
  );
}

function DropZone({
  children,
  onDrop,
}: {
  children: React.ReactNode;
  onDrop: (files: FileList) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    dragCounter.current++;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    dragCounter.current = 0;
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onDrop(event.dataTransfer.files);
    }
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowY: "auto",
        backgroundColor: (theme) => theme.palette.background.default,
        position: "relative",
        transition: "all 0.2s",
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(243, 128, 32, 0.1)",
            border: "3px dashed",
            borderColor: "primary.main",
            borderRadius: 2,
            margin: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <Typography variant="h5" color="primary" sx={{ fontWeight: 500 }}>
            Drop files here to upload
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function Main({
  search,
  onError,
  onFileStatsChange,
  viewMode,
  sortBy,
  useFuzzySearch,
}: {
  search: string;
  onError: (error: Error) => void;
  onFileStatsChange?: (stats: { total: number; filtered: number }) => void;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'size' | 'date';
  useFuzzySearch: boolean;
}) {
  const [cwd, setCwd] = React.useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [multiSelected, setMultiSelected] = useState<string[] | null>(null);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [copyLinkSnackbar, setCopyLinkSnackbar] = useState<string | null>(null);
  const [floatingUploads, setFloatingUploads] = useState<UploadItem[]>([]);
  const uploadManagerRef = useRef<UploadManager | null>(null);
  
  // Create upload manager instance immediately
  if (!uploadManagerRef.current) {
    uploadManagerRef.current = new UploadManager({
      onProgressUpdate: (uploads) => {
        setFloatingUploads([...uploads]); // Force re-render with new array
      },
      onUploadComplete: () => {},
      onUploadError: () => {},
      onUploadCancelled: () => {},
    });
  }

  const fetchFiles = useCallback(() => {
    setLoading(true);
    fetchPath(cwd)
      .then((files) => {
        setFiles(files);
        setMultiSelected(null);
      })
      .catch((error) => {
        onError(error);
      })
      .finally(() => setLoading(false));
  }, [cwd, onError]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = useMemo(
    () => {
      let searchResults: FileItem[];

      if (search && search.trim().length > 0) {
        // Use enhanced search with fuzzy matching toggle
        searchResults = enhancedSearch(files, search.trim(), useFuzzySearch);
      } else {
        searchResults = files;
      }

      // Sort: directories first, then apply selected sort.
      // Copy first — sort() mutates in place and would reorder `files`.
      const sorted = [...searchResults].sort((a, b) => {
        const aIsDir = isDirectory(a);
        const bIsDir = isDirectory(b);
        
        // Directories always come first
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        
        // If both are same type, apply selected sort
        switch(sortBy) {
          case 'name':
            return a.key.localeCompare(b.key);
          case 'size':
            return a.size - b.size;
          case 'date':
            return new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime();
          default:
            return a.key.localeCompare(b.key);
        }
      });
      
      // Update file statistics
      if (onFileStatsChange) {
        onFileStatsChange({ total: files.length, filtered: sorted.length });
      }
      
      return sorted;
    },
    [files, search, onFileStatsChange, sortBy, useFuzzySearch]
  );

  const handleMultiSelect = useCallback((key: string) => {
    setMultiSelected((multiSelected) => {
      if (multiSelected === null) {
        return [key];
      } else if (multiSelected.includes(key)) {
        const newSelected = multiSelected.filter((k) => k !== key);
        return newSelected.length ? newSelected : null;
      }
      return [...multiSelected, key];
    });
  }, []);

  return (
    <React.Fragment>
      {cwd && <PathBreadcrumb path={cwd} onCwdChange={setCwd} />}
      {loading ? (
        <Centered>
          <CircularProgress />
        </Centered>
      ) : (
        <DropZone
          onDrop={async (files) => {
            // Add files to queue and upload manager
            const uploadManager = uploadManagerRef.current;
            if (!uploadManager) return;

            Array.from(files).forEach((file) => {
              const uploadId = uploadManager.addUpload(file);
              const upload = uploadManager.getUpload(uploadId);

              uploadQueue.push({
                file,
                basedir: cwd,
                uploadId,
                abortController: upload?.abortController
              });
            });

            // Start processing uploads
            processUploadQueue(uploadManager);
          }}
        >
          {viewMode === 'list' ? (
            <FileList
              files={filteredFiles}
              onCwdChange={(newCwd: string) => setCwd(newCwd)}
              multiSelected={multiSelected}
              onMultiSelect={handleMultiSelect}
              emptyMessage={<Centered>No files or folders</Centered>}
            />
          ) : (
            <FileGrid
              files={filteredFiles}
              onCwdChange={(newCwd: string) => setCwd(newCwd)}
              multiSelected={multiSelected}
              onMultiSelect={handleMultiSelect}
              emptyMessage={<Centered>No files or folders</Centered>}
            />
          )}
        </DropZone>
      )}
      {multiSelected === null && (
        <UploadFab onClick={() => setShowUploadDrawer(true)} />
      )}
      <UploadDrawer
        open={showUploadDrawer}
        setOpen={setShowUploadDrawer}
        cwd={cwd}
        onUpload={() => {
          invalidateListings();
          fetchFiles();
        }}
        uploadManager={uploadManagerRef.current}
      />
      <MultiSelectToolbar
        multiSelected={multiSelected}
        onClose={() => setMultiSelected(null)}
        onDownload={() => {
          if (multiSelected?.length !== 1) return;
          const a = document.createElement("a");
          a.href = `/file/${encodeKey(multiSelected[0])}`;
          a.download = multiSelected[0].split("/").pop()!;
          a.click();
        }}
        onRename={async () => {
          if (multiSelected?.length !== 1) return;
          const newName = window.prompt("Rename to:");
          if (!newName) return;
          await copyPaste(multiSelected[0], cwd + newName, true);
          invalidateListings();
          fetchFiles();
        }}
        onDelete={async () => {
          if (!multiSelected?.length) return;
          const filenames = multiSelected
            .map((key) => key.replace(/\/$/, "").split("/").pop())
            .join("\n");
          const confirmMessage = "Delete the following file(s) permanently?";
          if (!window.confirm(`${confirmMessage}\n${filenames}`)) return;
          for (const key of multiSelected)
            await fetch(`/file/${encodeKey(key)}`, { method: "DELETE", headers: getAuthHeaders() });
          invalidateListings();
          fetchFiles();
        }}
        onCopyLink={async () => {
          if (multiSelected?.length !== 1 || multiSelected[0].endsWith("/")) return;
          
          const filePath = multiSelected[0];
          const fullUrl = `${window.location.origin}/file/${encodeKey(filePath)}`;
          
          try {
            if (navigator.clipboard && window.isSecureContext) {
              // Use modern clipboard API if available
              await navigator.clipboard.writeText(fullUrl);
            } else {
              // Fallback for older browsers or non-secure contexts
              const textArea = document.createElement('textarea');
              textArea.value = fullUrl;
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              textArea.style.top = '-999999px';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();

              try {
                document.execCommand('copy');
              } catch (err) {
                // Show user the URL in a prompt as last resort
                window.prompt('Copy this URL:', fullUrl);
              }

              document.body.removeChild(textArea);
            }

            // Show user feedback that link was copied
            const fileName = filePath.split('/').pop() || 'file';
            setCopyLinkSnackbar(`Link copied for: ${fileName}`);
          } catch (err) {
            // Show user the URL in a prompt as fallback
            window.prompt('Copy this URL:', fullUrl);
          }
        }}
      />
      <Snackbar
        open={Boolean(copyLinkSnackbar)}
        autoHideDuration={3000}
        onClose={() => setCopyLinkSnackbar(null)}
        message={copyLinkSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 80 }} // Position above the toolbar
      />
      <FloatingUploadProgress
        uploads={floatingUploads}
        onCancelUpload={(id) => {
          uploadManagerRef.current?.cancelUpload(id);
        }}
        onClearCompleted={() => {
          uploadManagerRef.current?.clearCompleted();
        }}
        onClose={() => {
          // Optionally handle close
        }}
      />
    </React.Fragment>
  );
}

export default Main;
