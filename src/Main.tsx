import { useEffect, useMemo, useState } from "react";
import FileList, { FileItem } from "./FileList";
import { Box, CircularProgress } from "@mui/material";

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

function Main({ search }: { search: string }) {
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [cwd, setCwd] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/children/${cwd}`)
      .then(
        (res) => res.json() as Promise<{ folders: string[]; value: FileItem[] }>
      )
      .then((files) => {
        setFiles(files.value);
        setFolders(files.folders);
        setLoading(false);
      });
  }, [cwd]);

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
      <FileList
        folders={folders}
        files={filteredFiles}
        onChangeCwd={(newCwd: string) => setCwd(newCwd)}
      />
    </div>
  );
}

export default Main;
