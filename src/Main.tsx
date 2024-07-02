import React, { useEffect, useMemo, useState } from "react";
import FileList, { FileItem } from "./FileList";
import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import { Home as HomeIcon } from "@mui/icons-material";
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
      <Link onClick={() => onCwdChange("")}>
        <HomeIcon />
      </Link>
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

  return (
    <React.Fragment>
      {loading ? (
        <Centered>
          <CircularProgress />
        </Centered>
      ) : (
        <div>
          {cwd && <PathBreadcrumb path={cwd} onCwdChange={setCwd} />}
          <FileList
            folders={filteredFolders}
            files={filteredFiles}
            onCwdChange={(newCwd: string) => setCwd(newCwd)}
          />
        </div>
      )}
      <UploadFab cwd={cwd} />
    </React.Fragment>
  );
}

export default Main;
