import AudioFileIcon from "@mui/icons-material/AudioFile";
import CodeIcon from "@mui/icons-material/Code";
import FolderIcon from "@mui/icons-material/Folder";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PdfIcon from "@mui/icons-material/PictureAsPdf";
import VideoFileIcon from "@mui/icons-material/VideoFile";

function MimeIcon({ contentType }: { contentType: string }) {
  const fallbackIcon = <InsertDriveFileOutlinedIcon fontSize="large" />;
  if (typeof contentType !== "string") return fallbackIcon;

  return contentType.startsWith("image/") ? (
    <ImageIcon fontSize="large" />
  ) : contentType.startsWith("audio/") ? (
    <AudioFileIcon fontSize="large" />
  ) : contentType.startsWith("video/") ? (
    <VideoFileIcon fontSize="large" />
  ) : contentType === "application/pdf" ? (
    <PdfIcon fontSize="large" />
  ) : ["application/zip", "application/gzip"].includes(contentType) ? (
    <FolderZipOutlinedIcon fontSize="large" />
  ) : contentType.startsWith("text/") ? (
    <CodeIcon fontSize="large" />
  ) : contentType === "application/x-directory" ? (
    <FolderIcon fontSize="large" />
  ) : (
    fallbackIcon
  );
}

export default MimeIcon;
