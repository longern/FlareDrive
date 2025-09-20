import React from "react";
import { Box, LinearProgress, Typography, Tooltip } from "@mui/material";
import { useTransferQueue, TransferTask } from "./app/transferQueue";

function getActiveTasks(queue: TransferTask[]) {
  return queue.filter(q => ["pending", "in-progress"].includes(q.status));
}

export default function MiniProgressDialog() {
  const queue = useTransferQueue();
  const activeTasks = getActiveTasks(queue);
  if (activeTasks.length === 0) return null;

  // Show summary of uploads/downloads
  const uploads = activeTasks.filter(t => t.type === "upload");
  const downloads = activeTasks.filter(t => t.type === "download");

  return (
    <Box sx={{
      position: "fixed",
      bottom: 24,
      left: 24,
      zIndex: 9999,
      minWidth: 220,
      bgcolor: "#222",
      boxShadow: 3,
      borderRadius: 2,
      p: 2,
      display: "flex",
      flexDirection: "column",
      gap: 1,
      color: '#fff'
    }}>
      {uploads.map((u) => (
        <Tooltip key={u.name} title={u.name}>
          <Box>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Uploading: {u.name}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={u.total ? (u.loaded / u.total) * 100 : 0}
              sx={{ bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#6B00FF' } }}
            />
            <Typography variant="caption" sx={{ color: '#fff' }}>
              {Math.round(u.loaded / 1024)} KB / {Math.round(u.total / 1024)} KB
            </Typography>
          </Box>
        </Tooltip>
      ))}
      {downloads.map((d) => (
        <Tooltip key={d.name} title={d.name}>
          <Box>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Downloading: {d.name}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={d.total ? (d.loaded / d.total) * 100 : 0}
              color="secondary"
              sx={{ bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#6B00FF' } }}
            />
            <Typography variant="caption" sx={{ color: '#fff' }}>
              {Math.round(d.loaded / 1024)} KB / {Math.round(d.total / 1024)} KB
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
