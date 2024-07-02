import { useEffect, useMemo, useState } from "react";
import FileList, { FileItem } from "./FileList";
import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import { Home as HomeIcon } from "@mui/icons-material";

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
  onChangeCwd,
}: {
  path: string;
  onChangeCwd: (newCwd: string) => void;
}) {
  const parts = path.replace(/\/$/, "").split("/");

  return (
    <Breadcrumbs separator="›" sx={{ padding: 1 }}>
      <Link onClick={() => onChangeCwd("")}>
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
              onChangeCwd(parts.slice(0, index + 1).join("/") + "/");
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
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [cwd, setCwd] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

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

  return loading ? (
    <Centered>
      <CircularProgress />
    </Centered>
  ) : (
    <div>
      {cwd && <PathBreadcrumb path={cwd} onChangeCwd={setCwd} />}
      <FileList
        folders={filteredFolders}
        files={filteredFiles}
        onChangeCwd={(newCwd: string) => setCwd(newCwd)}
      />
    </div>
  );
}

export default Main;
