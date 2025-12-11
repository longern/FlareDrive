// TextPadDrawer.tsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Drawer,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useUploadEnqueue } from "./app/transferQueue";

interface TextPadDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  cwd: string;
  onUpload: () => void;
}

const TextPadDrawer: React.FC<TextPadDrawerProps> = ({
  open,
  setOpen,
  cwd,
  onUpload,
}) => {
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState("note.txt");
  const uploadEnqueue = useUploadEnqueue();

  const handleSaveNote = () => {
    const fileBlob = new Blob([noteText], { type: "text/plain" });
    const file = new File([fileBlob], noteName, { type: "text/plain" });
    uploadEnqueue({ file, basedir: cwd });
    onUpload(); // Refresh file list after upload
    setOpen(false); // Close drawer
    setNoteText(""); // Reset
    setNoteName("note.txt");
  };

  return (
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box sx={{ width: 400, padding: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6">TextPad</Typography>
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <TextField
          label="File Name"
          value={noteName}
          onChange={(e) => setNoteName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="Write your note..."
          multiline
          rows={15}
          variant="outlined"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          fullWidth
        />

        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={handleSaveNote}
          disabled={!noteText.trim()}
        >
          Save & Upload Note
        </Button>
      </Box>
    </Drawer>
  );
};

export default TextPadDrawer;
