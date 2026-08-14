import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  FolderOpen as FolderIcon,
} from "@mui/icons-material";
import { FileItem, FileThumb, isDirectory } from "./FileGrid";

function humanReadableSize(size: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (size >= 1024) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function extractFilename(key: string) {
  return key.split("/").pop() || "";
}

function FileList({
  files,
  onCwdChange,
  onCopyLink,
  onDownload,
  multiSelected,
  onMultiSelect,
  emptyMessage,
}: {
  files: FileItem[];
  onCwdChange: (newCwd: string) => void;
  onCopyLink: (key: string) => void;
  onDownload: (key: string) => void;
  multiSelected: string[] | null;
  onMultiSelect: (key: string) => void;
  emptyMessage?: React.ReactNode;
}) {
  if (files.length === 0) return <>{emptyMessage}</>;

  const handleRowClick = (event: React.MouseEvent, file: FileItem) => {
    if (multiSelected !== null) {
      onMultiSelect(file.key);
    } else if (isDirectory(file)) {
      onCwdChange(file.key + "/");
    }
    event.preventDefault();
  };

  return (
    <TableContainer component={Paper} sx={{ marginBottom: "80px" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" width={44}></TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="right">Size</TableCell>
            <TableCell align="right">Modified</TableCell>
            <TableCell align="right" width={120}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => {
            const isDir = isDirectory(file);
            const isSelected = multiSelected?.includes(file.key) ?? false;

            return (
              <TableRow
                key={file.key}
                hover
                selected={isSelected}
                tabIndex={0}
                role="button"
                aria-label={`${extractFilename(file.key)}${isDir ? " folder, Enter to open" : ""}`}
                onClick={(e) => handleRowClick(e, file)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isDir) onCwdChange(file.key + "/");
                    else onDownload(file.key);
                  } else if (e.key === " ") {
                    e.preventDefault();
                    onMultiSelect(file.key);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onMultiSelect(file.key);
                }}
                sx={{ cursor: "pointer" }}
              >
                <TableCell padding="checkbox">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {isDir ? (
                      <FolderIcon color="primary" />
                    ) : (
                      <FileThumb file={file} size={28} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isDir ? 500 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 400,
                    }}
                  >
                    {extractFilename(file.key)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {!isDir ? humanReadableSize(file.size) : "-"}
                </TableCell>
                <TableCell align="right">
                  {new Date(file.uploaded).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  {!isDir && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      <Tooltip title="Copy share link">
                        <IconButton
                          size="small"
                          aria-label={`Copy link ${extractFilename(file.key)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyLink(file.key);
                          }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          aria-label={`Download ${extractFilename(file.key)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(file.key);
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default FileList;