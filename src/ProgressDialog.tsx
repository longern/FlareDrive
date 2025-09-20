import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { TransferTask, useTransferQueue } from "./app/transferQueue";
import { humanReadableSize } from "./app/utils";
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";

function ProgressDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(0);
  const transferQueue: TransferTask[] = useTransferQueue();

  const tasks = useMemo(() => {
    const taskType = tab === 0 ? "download" : "upload";
    return Object.values(transferQueue).filter(
      (task) => task.type === taskType
    );
  }, [tab, transferQueue]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ bgcolor: "#222", color: "#fff" }}>Progress</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, newTab) => setTab(newTab)}
        sx={{
          bgcolor: "#222",
          color: "#fff",
          "& .MuiTab-root": { flexBasis: "50%", color: "#fff" },
          "& .Mui-selected": { color: "#6B00FF" },
        }}
      >
        <Tab label="Downloads" />
        <Tab label="Uploads" />
      </Tabs>
      {tasks.length === 0 ? (
        <DialogContent sx={{ bgcolor: "#222" }}>
          <Typography textAlign="center" sx={{ color: "#fff" }}>
            No tasks
          </Typography>
        </DialogContent>
      ) : (
        <DialogContent sx={{ padding: 0, bgcolor: "#222" }}>
          <List>
            {tasks.map((task) => (
              <ListItem key={task.name} sx={{ bgcolor: "#222", color: "#fff" }}>
                <ListItemText
                  primary={task.name}
                  primaryTypographyProps={{ color: "#fff" }}
                  secondary={`${humanReadableSize(
                    task.loaded
                  )} / ${humanReadableSize(task.total)}`}
                  secondaryTypographyProps={{ color: "#fff" }}
                />
                {task.status === "failed" ? (
                  <Tooltip title={task.error.message}>
                    <ErrorOutlineIcon color="error" />
                  </Tooltip>
                ) : task.status === "completed" ? (
                  <CheckCircleOutlineIcon sx={{ color: "#6B00FF" }} />
                ) : task.status === "in-progress" ? (
                  <CircularProgress
                    variant="determinate"
                    size={24}
                    sx={{ color: "#6B00FF" }}
                    value={(task.loaded / task.total) * 100}
                  />
                ) : null}
              </ListItem>
            ))}
          </List>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default ProgressDialog;
