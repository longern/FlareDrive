import { Home as HomeIcon } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";

import FileGrid, { encodeKey, FileItem, isDirectory } from "./FileGrid";
import FileList from "./FileList";
import MultiSelectToolbar from "./MultiSelectToolbar";
import UploadDrawer, { UploadFab } from "./UploadDrawer";
import {
  copyPaste,
  createFolder,
  fetchPath,
  invalidateListings,
  isListingCached,
  processUploadQueue,
  uploadQueue,
} from "./app/transfer";
import { enhancedSearch } from "./utils/fuzzySearch";
import { getAuthHeaders } from "./utils/auth";
import FloatingUploadProgress, { UploadItem } from "./FloatingUploadProgress";
import UploadManager from "./utils/uploadManager";

// Copy a share link to the clipboard with a legacy fallback for non-secure
// contexts. Returns true when the link reached the clipboard.
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch {
    window.prompt("Copy this URL:", text);
    return false;
  }
}

function shareUrl(key: string): string {
  return `${window.location.origin}/file/${encodeKey(key)}`;
}

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

  // MUI dialogs replacing native prompt/confirm.
  const [folderOpen, setFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null);
  const [dialogValue, setDialogValue] = useState("");

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
    // No loading flash when the listing is served from cache.
    const cachedHit = isListingCached(cwd);
    if (!cachedHit) setLoading(true);
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

  const handleCopyLink = useCallback((key: string) => {
    if (key.endsWith("/")) return;
    copyText(shareUrl(key)).then(() => {
      const fileName = key.split("/").pop() || "file";
      setCopyLinkSnackbar(`Link copied: ${fileName}`);
    });
  }, []);

  const handleDownload = useCallback((key: string) => {
    const a = document.createElement("a");
    a.href = `/file/${encodeKey(key)}`;
    a.download = key.split("/").pop()!;
    a.click();
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
              onCopyLink={handleCopyLink}
              onDownload={handleDownload}
              multiSelected={multiSelected}
              onMultiSelect={handleMultiSelect}
              emptyMessage={<Centered>No files or folders</Centered>}
            />
          ) : (
            <FileGrid
              files={filteredFiles}
              onCwdChange={(newCwd: string) => setCwd(newCwd)}
              onCopyLink={handleCopyLink}
              onDownload={handleDownload}
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
        onCreateFolder={() => {
          setDialogValue("");
          setFolderOpen(true);
        }}
        uploadManager={uploadManagerRef.current}
      />
      <MultiSelectToolbar
        multiSelected={multiSelected}
        onClose={() => setMultiSelected(null)}
        onDownload={() => {
          if (multiSelected?.length !== 1) return;
          handleDownload(multiSelected[0]);
        }}
        onRename={() => {
          if (multiSelected?.length === 1) {
            setRenameTarget(multiSelected[0]);
            setDialogValue(multiSelected[0].split("/").pop() || "");
          } else {
            setRenameTarget(null);
          }
        }}
        onDelete={() => {
          if (multiSelected?.length) {
            setDeleteTargets([...multiSelected]);
            setDialogValue("");
          }
        }}
        onCopyLink={() => {
          if (multiSelected?.length === 1) handleCopyLink(multiSelected[0]);
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

      {/* Create-folder dialog */}
      <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Folder name"
            value={dialogValue}
            onChange={(e) => setDialogValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createFolder(cwd, dialogValue);
                setFolderOpen(false);
                invalidateListings();
                fetchFiles();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!dialogValue || dialogValue.includes("/")}
            onClick={() => {
              createFolder(cwd, dialogValue);
              setFolderOpen(false);
              invalidateListings();
              fetchFiles();
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rename</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="New name"
            value={dialogValue}
            onChange={(e) => setDialogValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!dialogValue}
            onClick={async () => {
              if (!renameTarget) return;
              await copyPaste(renameTarget, cwd + dialogValue, true);
              setRenameTarget(null);
              invalidateListings();
              fetchFiles();
            }}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteTargets !== null}
        onClose={() => setDeleteTargets(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete permanently?</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTargets
              ? deleteTargets
                  .map((k) => k.replace(/\/$/, "").split("/").pop())
                  .join(", ")
              : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargets(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteTargets) return;
              for (const key of deleteTargets)
                await fetch(`/file/${encodeKey(key)}`, { method: "DELETE", headers: getAuthHeaders() });
              setDeleteTargets(null);
              invalidateListings();
              fetchFiles();
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
