import React from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

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
  onChangeCwd,
}: {
  folders: string[];
  files: FileItem[];
  onChangeCwd: (newCwd: string) => void;
}) {
  return (
    <List>
      {folders.map((folder) => (
        <ListItem key={folder} disablePadding>
          <ListItemButton onClick={() => onChangeCwd(folder)}>
            <ListItemIcon>
              <InsertDriveFileOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary={folder} />
          </ListItemButton>
        </ListItem>
      ))}
      {files.map((file) => (
        <ListItem key={file.key} disablePadding>
          <ListItemButton>
            <ListItemText
              primary={extractFilename(file.key)}
              secondary={`${new Date(
                file.uploaded
              ).toLocaleDateString()} • ${humanReadableSize(file.size)}`}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

export default FileList;
