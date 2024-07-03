import React, { useCallback, useEffect, useMemo, useState } from "react";
import FileList, { FileItem } from "./FileList";
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Slide,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";
import UploadFab from "./UploadFab";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      {children}
    </Box>
  );
}

function PathBreadcrumb({
  path,
  onCwdChange,
}: {
  path: string;
  onCwdChange: (newCwd: string) => void;
}) {
  const parts = path.replace(/\/$/, "").split("/");

  return (
    <Breadcrumbs separator="›" sx={{ padding: 1 }}>
      <Button
        onClick={() => onCwdChange("")}
        sx={{
          minWidth: 0,
          padding: 0,
        }}
      >
        <HomeIcon />
      </Button>
      {parts.map((part, index) =>
        index === parts.length - 1 ? (
          <Typography key={index} color="text.primary">
            {part}
          </Typography>
        ) : (
          <Link
            key={index}
            onClick={() => {
              onCwdChange(parts.slice(0, index + 1).join("/") + "/");
            }}
          >
            {part}
          </Link>
        )
      )}
    </Breadcrumbs>
  );
}

function MultiSelectToolbar({
  multiSelected,
  onClose,
}: {
  multiSelected: string[] | null;
  onClose: () => void;
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
          borderTop: "1px solid lightgray",
          justifyContent: "space-evenly",
        }}
      >
        <IconButton color="primary" onClick={onClose}>
          <CloseIcon />
        </IconButton>
        <IconButton color="primary">
          <DownloadIcon />
        </IconButton>
        <IconButton color="primary">
          <DeleteIcon />
        </IconButton>
        <IconButton
          color="primary"
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
            {multiSelected.length === 1 && <MenuItem>Rename</MenuItem>}
            <MenuItem>Delete</MenuItem>
          </Menu>
        )}
      </Toolbar>
    </Slide>
  );
}

function Main({
  search,
  onError,
}: {
  search: string;
  onError: (error: Error) => void;
}) {
  const [cwd, setCwd] = React.useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [multiSelected, setMultiSelected] = useState<string[] | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/children/${cwd}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        if (!res.headers.get("Content-Type")?.includes("application/json"))
          throw new Error("Invalid response");
        return res.json() as Promise<{ folders: string[]; value: FileItem[] }>;
      })
      .then((files) => {
        setFiles(files.value);
        setFolders(files.folders);
      })
      .catch(onError)
      .finally(() => setLoading(false));
  }, [cwd, onError]);

  const filteredFolders = useMemo(
    () =>
      search
        ? folders.filter((folder) =>
            folder.toLowerCase().includes(search.toLowerCase())
          )
        : folders,
    [folders, search]
  );

  const filteredFiles = useMemo(
    () =>
      search
        ? files.filter((file) =>
            file.key.toLowerCase().includes(search.toLowerCase())
          )
        : files,
    [files, search]
  );

  const handleMultiSelect = useCallback(
    (key: string) => {
      if (multiSelected === null) {
        setMultiSelected([key]);
      } else if (multiSelected.includes(key)) {
        const newSelected = multiSelected.filter((k) => k !== key);
        setMultiSelected(newSelected.length ? newSelected : null);
      } else {
        setMultiSelected([...multiSelected, key]);
      }
    },
    [multiSelected]
  );

  return (
    <React.Fragment>
      {cwd && <PathBreadcrumb path={cwd} onCwdChange={setCwd} />}
      {loading ? (
        <Centered>
          <CircularProgress />
        </Centered>
      ) : (
        <FileList
          folders={filteredFolders}
          files={filteredFiles}
          onCwdChange={(newCwd: string) => setCwd(newCwd)}
          multiSelected={multiSelected}
          onMultiSelect={handleMultiSelect}
        />
      )}
      <UploadFab cwd={cwd} />
      <MultiSelectToolbar
        multiSelected={multiSelected}
        onClose={() => setMultiSelected(null)}
      />
    </React.Fragment>
  );
}

export default Main;
