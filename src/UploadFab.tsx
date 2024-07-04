import React from "react";

import { Button, Card, Drawer, Fab, Grid, Typography } from "@mui/material";
import {
  CreateNewFolder as CreateNewFolderIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { createFolder } from "./app/transfer";

function IconCaptionButton({
  icon,
  caption,
  onClick,
}: {
  icon: React.ReactNode;
  caption: string;
  onClick?: () => void;
}) {
  return (
    <Button
      color="inherit"
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClick}
    >
      {icon}
      <Typography
        variant="caption"
        sx={{ textTransform: "none", textWrap: "nowrap" }}
      >
        {caption}
      </Typography>
    </Button>
  );
}

function UploadFab({ cwd }: { cwd: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment>
      <Fab
        variant="circular"
        color="primary"
        size="large"
        sx={{
          position: "fixed",
          right: 16,
          bottom: 16,
          color: "white",
        }}
        onClick={() => setOpen(true)}
      >
        <UploadIcon fontSize="large" />
      </Fab>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { borderRadius: "16px 16px 0 0" } }}
      >
        <Card sx={{ padding: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <IconCaptionButton
                icon={<UploadIcon fontSize="large" />}
                caption="Upload"
              />
            </Grid>
            <Grid item xs={3}>
              <IconCaptionButton
                icon={<CreateNewFolderIcon fontSize="large" />}
                caption="Create Folder"
                onClick={() => createFolder(cwd)}
              />
            </Grid>
          </Grid>
        </Card>
      </Drawer>
    </React.Fragment>
  );
}

export default UploadFab;
