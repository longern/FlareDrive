import { Home as HomeIcon } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import FileGrid, { FileItem } from "./FileGrid";
import MultiSelectToolbar from "./MultiSelectToolbar";
import UploadFab from "./UploadFab";
import { copyPaste } from "./app/transfer";

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
            component="button"
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
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [multiSelected, setMultiSelected] = useState<string[] | null>(null);

  const fetchFiles = useCallback(() => {
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
        setMultiSelected(null);
      })
      .catch(onError)
      .finally(() => setLoading(false));
  }, [cwd, onError]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = useMemo(
    () =>
      (search
        ? files.filter((file) =>
            file.key.toLowerCase().includes(search.toLowerCase())
          )
        : files
      ).sort((a, b) =>
        a.httpMetadata?.contentType === "application/x-directory"
          ? -1
          : b.httpMetadata?.contentType === "application/x-directory"
          ? 1
          : 0
      ),
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
        <FileGrid
          files={filteredFiles}
          onCwdChange={(newCwd: string) => setCwd(newCwd)}
          multiSelected={multiSelected}
          onMultiSelect={handleMultiSelect}
          emptyMessage={<Centered>No files or folders</Centered>}
        />
      )}
      {multiSelected === null && <UploadFab cwd={cwd} onUpload={fetchFiles} />}
      <MultiSelectToolbar
        multiSelected={multiSelected}
        onClose={() => setMultiSelected(null)}
        onDownload={() => {
          if (multiSelected?.length !== 1) return;
          const a = document.createElement("a");
          a.href = `/raw/${multiSelected[0]}`;
          a.download = multiSelected[0].split("/").pop()!;
          a.click();
        }}
        onRename={async () => {
          if (multiSelected?.length !== 1) return;
          const key = multiSelected[0];
          const newName = window.prompt("Rename to:");
          if (!newName) return;
          await copyPaste(key, `${cwd}${newName}`);
          await fetch(`/api/write/items/${key}`, { method: "DELETE" });
          fetchFiles();
        }}
        onDelete={async () => {
          if (!multiSelected?.length) return;
          const filenames = multiSelected
            .map((key) => key.replace(/\/$/, "").split("/").pop())
            .join("\n");
          const confirmMessage = "Delete the following file(s) permanently?";
          if (!window.confirm(`${confirmMessage}\n${filenames}`)) return;
          for (const key of multiSelected)
            await fetch(`/api/write/items/${key}`, { method: "DELETE" });
          fetchFiles();
        }}
      />
    </React.Fragment>
  );
}

export default Main;
