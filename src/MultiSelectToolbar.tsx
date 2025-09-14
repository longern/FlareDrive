import React, { useState } from "react";
import { IconButton, Menu, MenuItem, Slide, Toolbar, Tooltip } from "@mui/material";
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";

function MultiSelectToolbar({
  multiSelected,
  onClose,
  onDownload,
  onRename,
  onDelete,
  onCopyLink,
}: {
  multiSelected: string[] | null;
  onClose: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Slide direction="up" in={multiSelected !== null}>
      <Toolbar
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: (theme) => theme.palette.background.paper,
          borderTop: "1px solid lightgray",
          justifyContent: "space-evenly",
        }}
      >
        <Tooltip title="Close">
          <IconButton color="primary" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <span>
            <IconButton
              color="primary"
              disabled={
                multiSelected?.length !== 1 || multiSelected[0].endsWith("/")
              }
              onClick={onDownload}
            >
              <DownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Copy Link">
          <span>
            <IconButton
              color="primary"
              disabled={
                multiSelected?.length !== 1 || multiSelected[0].endsWith("/")
              }
              onClick={onCopyLink}
            >
              <LinkIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton color="primary" onClick={onDelete}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <IconButton
          color="primary"
          disabled={
            multiSelected?.length !== 1 || multiSelected[0].endsWith("/")
          }
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <MoreHorizIcon />
        </IconButton>
        {multiSelected?.length && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {multiSelected.length === 1 && (
              <React.Fragment>
                <MenuItem 
                  onClick={() => {
                    onRename();
                    setAnchorEl(null);
                  }}
                >
                  Rename
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    onCopyLink();
                    setAnchorEl(null);
                  }}
                  disabled={multiSelected[0].endsWith("/")}
                >
                  Copy Link
                </MenuItem>
              </React.Fragment>
            )}
          </Menu>
        )}
      </Toolbar>
    </Slide>
  );
}

export default MultiSelectToolbar;
