# FlareDrive

Cloudflare R2 storage manager with Pages and Workers. Free 10 GB storage.
Free serverless backend with a limit of 100,000 invocation requests per day.
[More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Features

### File Management
- **Upload large files** - Support for files of any size with chunked uploads
- **Create folders** - Organize your files with folder structure
- **Drag and drop upload** - Enhanced drag & drop interface with visual feedback
- **Multi-file operations** - Select multiple files for bulk operations
- **File operations** - Download, rename, delete, copy link

### User Interface
- **Dual view modes** - Switch between grid and list view
- **Advanced search** - Smart fuzzy search with exact match toggle
- **Flexible sorting** - Sort by name, size, or date modified
- **Floating upload progress** - Real-time upload tracking with cancel option
- **Responsive design** - Works seamlessly on desktop and mobile

### Media & Preview
- **Image/video/PDF thumbnails** - Visual preview for supported file types
- **File type icons** - Clear visual indicators for different file types
- **Breadcrumb navigation** - Easy folder navigation

### Integration & Access
- **WebDAV endpoint** - Standard protocol support for third-party clients
- **Authentication system** - Secure login with customizable credentials
- **Public read option** - Optional public access to files
- **Direct file links** - Share files with copyable URLs

## Usage

### User Interface Guide

#### File Upload
- **Drag & Drop**: Simply drag files from your computer into the browser window
- **Upload Button**: Click the floating upload button (bottom-right) to select files
- **Upload Progress**: Monitor uploads with the floating progress indicator
- **Cancel Uploads**: Cancel in-progress uploads if needed

#### File Management
- **View Modes**: Switch between grid view (thumbnails) and list view (detailed)
- **Sorting**: Sort files by name, size, or modification date
- **Search**: Use fuzzy search for flexible file finding, or exact search for precise matching
- **Multi-select**: Right-click or long-press to select multiple files
- **File Operations**: Download, rename, delete files, or copy shareable links

#### Navigation
- **Folders**: Click on folders to navigate, use breadcrumbs to go back
- **Search Results**: View how many files match your search query
- **File Statistics**: See total files and filtered results in real-time

### Installation

Before starting, you should make sure that

- you have created a [Cloudflare](https://dash.cloudflare.com/) account
- your payment method is added
- R2 service is activated and at least one bucket is created

Steps:

1. Fork this project and connect your fork with Cloudflare Pages
   - Select `Create React App` framework preset
   - Set `WEBDAV_USERNAME` and `WEBDAV_PASSWORD`
   - (Optional) Set `WEBDAV_PUBLIC_READ` to `1` to enable public read
2. After initial deployment, bind your R2 bucket to `BUCKET` variable
3. Retry deployment in `Deployments` page to apply the changes
4. (Optional) Add a custom domain

You can also deploy this project using Wrangler CLI:

```bash
npm run build
npx wrangler pages deploy build
```

### WebDAV endpoint

You can use any client (such as [BD File Manager](https://play.google.com/store/apps/details?id=com.liuzho.file.explorer))
that supports the WebDAV protocol to access your files.
Fill the endpoint URL as `https://<your-domain.com>/webdav` and use the username and password you set.

However, the standard WebDAV protocol does not support large file (≥128MB) uploads due to the limitation of Cloudflare Workers.
You must upload large files through the web interface which supports chunked uploads.

## Technical Features

### Upload System
- **Chunked uploads** for files ≥100MB with progress tracking
- **Concurrent upload** support with queue management
- **Upload cancellation** with proper cleanup
- **Retry mechanism** for failed uploads
- **Thumbnail generation** for images, videos, and PDFs

### Search & Filter
- **Fuzzy search algorithm** with Levenshtein distance and n-gram similarity
- **Real-time filtering** with instant results
- **Search statistics** showing matched/total files
- **Case-insensitive** search with accent support

### Performance
- **Optimized file parsing** with XML sanitization and fallback
- **Efficient rendering** with virtual scrolling for large file lists
- **Responsive UI** with smooth transitions and loading states
- **Memory management** with proper cleanup of upload resources

### Security
- **Authentication system** with secure credential storage
- **CORS handling** for cross-origin requests
- **Input sanitization** for file names and metadata
- **Error handling** with user-friendly messages

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Debug Features
- **Comprehensive logging** throughout upload and file operations
- **Upload debugging** with detailed progress and error tracking
- **Test upload button** (localhost only) for UI component testing
- **Console debugging** with step-by-step operation logs

### Project Structure
```
src/
├── components/          # UI components
│   ├── FileGrid.tsx    # Grid view component
│   ├── FileList.tsx    # List view component
│   ├── Header.tsx      # Main header with toolbar
│   └── ...            # Other components
├── utils/              # Utility modules
│   ├── fuzzySearch.ts  # Advanced search algorithms
│   ├── uploadManager.ts # Upload queue management
│   └── xmlParser.ts    # XML parsing utilities
├── app/                # Core application logic
│   └── transfer.ts     # File operations and API calls
└── ...                # Other files
```

## Acknowledgments

WebDAV related code is based on [r2-webdav](
  https://github.com/abersheeran/r2-webdav
) project by [abersheeran](
  https://github.com/abersheeran
).
