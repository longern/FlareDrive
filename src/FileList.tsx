import React from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import MimeIcon from "./MimeIcon";

export interface FileItem {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata: {
    contentType: string;
  };
  customMetadata?: {
    thumbnail: string;
  };
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

function FileList({
  folders,
  files,
  onCwdChange,
  multiSelected,
  onMultiSelect,
}: {
  folders: string[];
  files: FileItem[];
  onCwdChange: (newCwd: string) => void;
  multiSelected: string[] | null;
  onMultiSelect: (key: string) => void;
}) {
  return (
    <List disablePadding>
      {folders.map((folder) => (
        <ListItem key={folder} disablePadding>
          <ListItemButton
            selected={multiSelected?.includes(folder)}
            sx={{ minHeight: 64 }}
            onClick={() =>
              multiSelected !== null
                ? onMultiSelect(folder)
                : onCwdChange(folder)
            }
            onContextMenu={(e) => {
              e.preventDefault();
              onMultiSelect(folder);
            }}
          >
            <ListItemIcon>
              <FolderIcon fontSize="large" />
            </ListItemIcon>
            <ListItemText primary={folder.replace(/.*?([^/]+)\/$/, "$1")} />
          </ListItemButton>
        </ListItem>
      ))}
      {files.map((file) => (
        <ListItem key={file.key} disablePadding>
          <ListItemButton
            component="a"
            href={`/raw/${file.key}`}
            target="_blank"
            rel="noopener noreferrer"
            selected={multiSelected?.includes(file.key)}
            onClick={(event) => {
              if (multiSelected !== null) {
                onMultiSelect(file.key);
                event.preventDefault();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onMultiSelect(file.key);
            }}
          >
            <ListItemIcon>
              {file.customMetadata?.thumbnail ? (
                <img
                  src={`/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`}
                  alt={file.key}
                  style={{ width: 36, height: 36, objectFit: "cover" }}
                />
              ) : (
                <MimeIcon contentType={file.httpMetadata.contentType} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={extractFilename(file.key)}
              primaryTypographyProps={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              secondary={`${new Date(
                file.uploaded
              ).toLocaleString()} • ${humanReadableSize(file.size)}`}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

export default FileList;
