import React from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
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
  return files.length === 0 ? (
    emptyMessage
  ) : (
    <List disablePadding>
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
              } else if (
                file.httpMetadata?.contentType === "application/x-directory"
              ) {
                onCwdChange(file.key + "/");
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
              secondary={
                <React.Fragment>
                  {new Date(file.uploaded).toLocaleString()}
                  {file.httpMetadata?.contentType !==
                    "application/x-directory" &&
                    ` • ${humanReadableSize(file.size)}`}
                </React.Fragment>
              }
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

export default FileList;
