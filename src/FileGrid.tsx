import React, { useState } from "react";
import { Box, Grid, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { Folder as FolderIcon } from "@mui/icons-material";
import MimeIcon from "./MimeIcon";

export interface FileItem {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata: { contentType: string };
  customMetadata?: { thumbnail?: string };
}

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
  return key.split("/").pop();
}

export function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function isDirectory(file: FileItem) {
  return file.httpMetadata?.contentType === "application/x-directory";
}

// Shared thumbnail renderer: falls back to the MIME icon on any error (missing
// hash, revoked object) so a broken <img> never shows.
export function FileThumb({ file, size = 36 }: { file: FileItem; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (file.customMetadata?.thumbnail && !broken) {
    return (
      <img
        src={`/file/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`}
        alt={extractFilename(file.key)}
        loading="lazy"
        onError={() => setBroken(true)}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: 8,
        }}
      />
    );
  }
  return <MimeIcon contentType={file.httpMetadata.contentType} />;
}

// Compact rows matching the original grid: thumbnail on the left, name + size on
// the right, no per-row actions (copy/download are on right-click context menu).
// onCopyLink/onDownload are accepted for signature compatibility with Main but
// intentionally unused.
function FileGrid({
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
  onCopyLink?: (key: string) => void;
  onDownload?: (key: string) => void;
  multiSelected: string[] | null;
  onMultiSelect: (key: string) => void;
  emptyMessage?: React.ReactNode;
}) {
  if (files.length === 0) return <>{emptyMessage}</>;

  return (
    <Grid container sx={{ paddingBottom: "80px" }}>
      {files.map((file) => {
        const isDir = isDirectory(file);
        return (
          <Grid item key={file.key} xs={12} sm={6} md={4} lg={3} xl={2}>
            <ListItemButton
              selected={multiSelected?.includes(file.key)}
              onClick={() => {
                if (multiSelected !== null) {
                  onMultiSelect(file.key);
                } else if (isDir) {
                  onCwdChange(file.key + "/");
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onMultiSelect(file.key);
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {isDir ? (
                  <FolderIcon color="primary" />
                ) : (
                  <FileThumb file={file} size={36} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={extractFilename(file.key)}
                primaryTypographyProps={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                secondary={
                  !isDir ? (
                    <Box component="span" sx={{ fontSize: "0.75rem" }}>
                      {humanReadableSize(file.size)}
                    </Box>
                  ) : (
                    undefined
                  )
                }
              />
            </ListItemButton>
          </Grid>
        );
      })}
    </Grid>
  );
}

export default FileGrid;
