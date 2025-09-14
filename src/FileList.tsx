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
} from "@mui/material";
import MimeIcon from "./MimeIcon";
import { FileItem, encodeKey, isDirectory } from "./FileGrid";

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
  multiSelected,
  onMultiSelect,
  emptyMessage,
}: {
  files: FileItem[];
  onCwdChange: (newCwd: string) => void;
  multiSelected: string[] | null;
  onMultiSelect: (key: string) => void;
  emptyMessage?: React.ReactNode;
}) {
  if (files.length === 0) {
    return <>{emptyMessage}</>;
  }

  const handleRowClick = (event: React.MouseEvent, file: FileItem) => {
    if (multiSelected !== null) {
      onMultiSelect(file.key);
      event.preventDefault();
    } else if (isDirectory(file)) {
      onCwdChange(file.key + "/");
      event.preventDefault();
    } else {
      // Open file in new tab
      window.open(`/file/${encodeKey(file.key)}`, "_blank");
      event.preventDefault();
    }
  };

  return (
    <TableContainer component={Paper} sx={{ marginBottom: "48px" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" width={40}></TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="right">Size</TableCell>
            <TableCell align="right">Modified</TableCell>
            <TableCell align="right">Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => {
            const isDir = isDirectory(file);
            const isSelected = multiSelected?.includes(file.key) || false;
            
            return (
              <TableRow
                key={file.key}
                hover
                selected={isSelected}
                onClick={(e) => handleRowClick(e, file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onMultiSelect(file.key);
                }}
                sx={{ 
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  }
                }}
              >
                <TableCell padding="checkbox">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {file.customMetadata?.thumbnail ? (
                      <img
                        src={`/file/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`}
                        alt={file.key}
                        style={{ 
                          width: 24, 
                          height: 24, 
                          objectFit: "cover",
                          borderRadius: 4
                        }}
                      />
                    ) : (
                      <MimeIcon contentType={file.httpMetadata.contentType} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {!isDir ? humanReadableSize(file.size) : "-"}
                </TableCell>
                <TableCell align="right">
                  {new Date(file.uploaded).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" color="text.secondary">
                    {isDir ? "Folder" : file.httpMetadata.contentType.split("/")[1]?.toUpperCase() || "File"}
                  </Typography>
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