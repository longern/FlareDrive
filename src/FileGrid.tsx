import React, { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
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
  onCopyLink: (key: string) => void;
  onDownload: (key: string) => void;
  multiSelected: string[] | null;
  onMultiSelect: (key: string) => void;
  emptyMessage?: React.ReactNode;
}) {
  if (files.length === 0) return <>{emptyMessage}</>;

  const handleActivate = (file: FileItem) => {
    if (isDirectory(file)) onCwdChange(file.key + "/");
  };

  return (
    <Grid container spacing={2} sx={{ padding: 2, paddingBottom: "80px" }}>
      {files.map((file) => {
        const isDir = isDirectory(file);
        const selected = multiSelected?.includes(file.key) ?? false;
        return (
          <Grid item key={file.key} xs={12} sm={6} md={4} lg={3} xl={2}>
            <Card
              elevation={selected ? 4 : 1}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                border: selected ? "2px solid" : "1px solid",
                borderColor: selected ? "primary.main" : "divider",
                cursor: "pointer",
                transition: "transform .15s ease, box-shadow .15s ease",
                "&:hover": { transform: "translateY(-2px)" },
              }}
              onClick={() => onMultiSelect(file.key)}
              onContextMenu={(e) => {
                e.preventDefault();
                onMultiSelect(file.key);
              }}
            >
              <CardActionArea
                onClick={() => handleActivate(file)}
                sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
              >
                <Box
                  sx={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: (t) => (t.palette.mode === "dark" ? "action.hover" : "grey.50"),
                  }}
                >
                  {isDir ? (
                    <FolderIcon color="primary" sx={{ fontSize: 56, opacity: 0.85 }} />
                  ) : (
                    <FileThumb file={file} size={64} />
                  )}
                </Box>
                <Box sx={{ p: 1.5, flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight={isDir ? 600 : 400}
                    noWrap
                    title={extractFilename(file.key)}
                  >
                    {extractFilename(file.key)}
                  </Typography>
                  {!isDir && (
                    <Typography variant="caption" color="text.secondary">
                      {humanReadableSize(file.size)}
                    </Typography>
                  )}
                </Box>
              </CardActionArea>
              {!isDir && (
                <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
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
                </CardActions>
              )}
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

export default FileGrid;
