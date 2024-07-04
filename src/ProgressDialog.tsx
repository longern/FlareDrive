import { Dialog, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import { useState } from "react";

function ProgressDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Progress</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, newTab) => setTab(newTab)}
        sx={{ "& .MuiTab-root": { flexBasis: "50%" } }}
      >
        <Tab label="Downloads" />
        <Tab label="Uploads" />
      </Tabs>
      <DialogContent>{tab === 0 ? "Downloads" : "Uploads"}</DialogContent>
    </Dialog>
  );
}

export default ProgressDialog;
