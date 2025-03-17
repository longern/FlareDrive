// TextPadDrawer.tsx
import React, { useState } from "react";
import {
  Drawer,
  IconButton,
  TextField,
  Box,
  Typography,
  Button,
} from "@mui/material";
import { Close as CloseIcon, Save as SaveIcon } from "@mui/icons-material";
import { useUploadEnqueue } from "./app/transferQueue";

const TextPadDrawer = ({
  open,
  setOpen,
  cwd,
  onUpload,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  cwd: string;
  onUpload: () => void;
}) => {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const uploadEnqueue = useUploadEnqueue();

  const handleSaveAndUpload = async () => {
    if (!noteTitle || !noteContent) return;

    const file = new File([noteContent], `${noteTitle}.txt`, {
      type: "text/plain",
    });

    uploadEnqueue({ file, basedir: cwd });
    setOpen(false);
    setNoteTitle("");
    setNoteContent("");
    onUpload();
  };

  return (
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box sx={{ width: 400, padding: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">TextPad</Typography>
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <TextField
          label="Note Title"
          fullWidth
          variant="outlined"
          margin="normal"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
        />

        <TextField
          label="Write your note"
          fullWidth
          multiline
          rows={12}
          variant="outlined"
          margin="normal"
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        />

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleSaveAndUpload}
        >
          Save & Upload
        </Button>
      </Box>
    </Drawer>
  );
};

export default TextPadDrawer;
