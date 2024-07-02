import React from "react";

import { Button, Card, Drawer, Fab, Grid, Typography } from "@mui/material";
import {
  CreateNewFolder as CreateNewFolderIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";

function IconCaptionButton({
  icon,
  caption,
}: {
  icon: React.ReactNode;
  caption: string;
}) {
  return (
    <Button
      color="inherit"
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
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

function UploadFab() {
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment>
      <Fab
        variant="extended"
        color="primary"
        size="large"
        sx={{
          position: "fixed",
          right: 16,
          bottom: 16,
          width: 64,
          height: 64,
          borderRadius: 32,
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
              />
            </Grid>
          </Grid>
        </Card>
      </Drawer>
    </React.Fragment>
  );
}

export default UploadFab;
