import AudioFileIcon from "@mui/icons-material/AudioFile";
import CodeIcon from "@mui/icons-material/Code";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PdfIcon from "@mui/icons-material/PictureAsPdf";
import VideoFileIcon from "@mui/icons-material/VideoFile";

function MimeIcon({ contentType }: { contentType: string }) {
  return contentType.startsWith("image/") ? (
    <ImageIcon fontSize="large" />
  ) : contentType.startsWith("audio/") ? (
    <AudioFileIcon fontSize="large" />
  ) : contentType.startsWith("video/") ? (
    <VideoFileIcon fontSize="large" />
  ) : contentType === "application/pdf" ? (
    <PdfIcon fontSize="large" />
  ) : contentType.startsWith("text/") ? (
    <CodeIcon fontSize="large" />
  ) : (
    <InsertDriveFileOutlinedIcon fontSize="large" />
  );
}

export default MimeIcon;
