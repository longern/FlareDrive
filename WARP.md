# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

FlareDrive is a Cloudflare R2 storage manager built with React and Cloudflare Pages Functions. It provides a dual interface: a modern web UI and WebDAV protocol support for client compatibility. Key features include:

- Upload large files with chunked multipart upload (≥100MB files via web interface)
- Create folders and manage file hierarchies  
- Search files and navigate directories
- Generate and serve image/video/PDF thumbnails (144x144px)
- WebDAV endpoint for client applications (file managers, etc.)
- Drag and drop upload with progress tracking

## Environment Setup Requirements

### Prerequisites
- Cloudflare account with payment method added
- R2 service activated with at least one bucket created
- Node.js environment for local development
- Wrangler CLI for deployment

### Environment Variables
Set the following in Cloudflare Pages environment variables:
- `WEBDAV_USERNAME` - Username for WebDAV authentication
- `WEBDAV_PASSWORD` - Password for WebDAV authentication  
- `WEBDAV_PUBLIC_READ` (optional) - Set to `1` to enable public read access
- `BUCKET` - R2 bucket binding for file storage

## Common Development Commands

```bash
npm start          # Start React development server
npm run build      # Build production bundle for deployment
npm test           # Run test suite
npm run eject      # Eject from Create React App (not recommended)
```

### Deployment Commands
```bash
npm run build                    # Build the React app
npx wrangler pages deploy build  # Deploy to Cloudflare Pages
```

## High-Level Architecture

### Dual Architecture Pattern
FlareDrive uses a dual architecture:
1. **React SPA** (`src/`) - Modern web UI for file management
2. **Cloudflare Pages Functions** (`functions/`) - ServerlessWebDAV + REST API backend

### Data Flow
- **UI → Functions**: React app calls Cloudflare Functions via `/file/*` routes
- **WebDAV Clients → Functions**: External clients use WebDAV protocol endpoints  
- **Functions → R2**: All file operations go through Cloudflare R2 storage
- **Thumbnails**: Generated client-side and stored in R2 at `_$flaredrive$/thumbnails/`

### React Frontend Structure (`src/`)
- **App.tsx**: Main app component with AuthProvider, theme, conditional rendering
- **AuthContext.tsx**: Authentication state management and login logic
- **Login.tsx**: Login form component for web interface authentication
- **LogoutButton.tsx**: Logout button component for header
- **Main.tsx**: Core file browser with breadcrumbs, drag-drop, multi-select
- **FileGrid.tsx**: File/folder grid display with thumbnails and metadata
- **Header.tsx**: Top navigation with search and logout functionality
- **UploadDrawer.tsx**: File upload interface and progress tracking
- **MultiSelectToolbar.tsx**: Actions for selected files (download, rename, delete)
- **app/transfer.ts**: File operations with authentication headers

### Cloudflare Functions Backend (`functions/file/`)
WebDAV + REST API implementation:
- **[[path]].ts**: Main request router and authentication handler
- **propfind.ts**: WebDAV PROPFIND (list directories/files) 
- **get.ts**: Download files and serve content
- **put.ts**: Upload files (single part)
- **post.ts**: Multipart upload initiation and completion
- **copy.ts**, **move.ts**: File copy and move operations
- **delete.ts**: File deletion
- **mkcol.ts**: Create directories
- **head.ts**: File metadata requests
- **utils.ts**: Shared utilities (bucket parsing, listing, authentication)

### WebDAV Implementation Details
- **Supported Methods**: PROPFIND, MKCOL, HEAD, GET, POST, PUT, COPY, MOVE, DELETE, OPTIONS
- **Authentication**: Dual authentication system:
  - HTTP Basic Auth for WebDAV clients
  - Session-based auth for web interface (requires login)
  - Direct file access (GET) remains public when WEBDAV_PUBLIC_READ is enabled
- **XML Responses**: Custom XML generation for 207 Multi-Status responses
- **Path Mapping**: WebDAV URLs map directly to R2 object keys
- **Client Compatibility**: Works with standard WebDAV clients (file managers, etc.)

### Multipart Upload System
- **Chunk Size**: 100MB per part (`SIZE_LIMIT` in `transfer.ts`)
- **Concurrency**: 2 concurrent uploads using `p-limit`
- **Initiation**: `POST /file/{path}?uploads` creates multipart upload
- **Part Upload**: `PUT /file/{path}?partNumber=N&uploadId=X` uploads chunks
- **Completion**: `POST /file/{path}?uploadId=X` with parts list finalizes upload
- **Progress Tracking**: XHR-based uploads with progress events

### File Management and Thumbnails
- **Thumbnail Generation**: Client-side canvas rendering for images, videos, PDFs
- **Thumbnail Storage**: R2 at `/_$flaredrive$/thumbnails/{sha1}.png`  
- **Metadata**: Custom metadata `fd-thumbnail` header links files to thumbnails
- **Search**: Client-side filtering by filename (case-insensitive)
- **Operations**: Copy, move, rename, delete via WebDAV methods

## Key Directories

```
/src/                   # React frontend source code
  /app/                 # Application logic (transfer, API calls)
/functions/             # Cloudflare Pages Functions (WebDAV + REST API)
  /file/                # File operation handlers
/public/                # Static assets (favicon, manifest, etc.)
/utils/                 # Shared utilities (S3 client for R2)
package.json           # Dependencies and scripts
tsconfig.json          # TypeScript configuration
.gitignore            # Git ignore rules
```

## Development Workflow

### Local Development
1. Set up Cloudflare account and R2 bucket
2. Configure environment variables in Cloudflare Pages dashboard
3. Run `npm install` to install dependencies
4. Run `npm start` to start React development server
5. Pages Functions run automatically in development mode
6. Access WebDAV at `http://localhost:3000/file/` (when running locally)

### Testing WebDAV Connectivity
Use WebDAV clients like:
- **BD File Manager** (Android)
- **Finder** (macOS) - Connect to Server
- **File Explorer** (Windows) - Map Network Drive
- **Cyberduck** or similar desktop clients

Endpoint: `https://<your-domain>/file/` (not `/webdav/` as mentioned in README)

## Deployment

### Cloudflare Pages Deployment
1. Fork repository and connect to Cloudflare Pages
2. Set framework preset to "Create React App" 
3. Configure environment variables (`WEBDAV_USERNAME`, `WEBDAV_PASSWORD`, etc.)
4. Bind R2 bucket to `BUCKET` variable in Pages dashboard
5. Deploy triggers automatic build and deployment

### Manual Deployment
```bash
npm run build                    # Build React app
npx wrangler pages deploy build  # Deploy to Cloudflare Pages
```

## Important Technical Details and Tradeoffs

### Architecture Tradeoffs
- **Client-side thumbnails**: Generated in browser (good: no server load, bad: slower uploads)
- **WebDAV + SPA**: Dual interface increases complexity but maximizes compatibility
- **R2 direct**: No database for metadata, relies on R2 object metadata and listing

### Performance Considerations
- **Large directories**: Performance may degrade with thousands of files (R2 list operations)
- **Thumbnail caching**: Thumbnails stored permanently in R2, no cleanup mechanism
- **Upload limits**: WebDAV uploads limited to <128MB due to Cloudflare Workers request limits

### Authentication and Access Control
- **Web Interface**: Requires login with WebDAV credentials before accessing file browser
- **Direct File Access**: GET requests remain public (no authentication required)
- **WebDAV Clients**: Use HTTP Basic Auth with username/password
- **Session Management**: Web sessions stored in localStorage
- **Directory Listing**: PROPFIND requests always require authentication

### WebDAV Limitations
- **Large file uploads**: Must use web interface for files ≥128MB (Workers request size limit)
- **Path encoding**: Special characters in filenames may cause issues with some clients
- **Concurrent operations**: No locking mechanism for concurrent WebDAV operations

### Storage Layout
- **Files**: Stored directly in R2 bucket with original paths as keys
- **Folders**: Represented as objects with `application/x-directory` content-type
- **Thumbnails**: Stored under `_$flaredrive$/thumbnails/` prefix with SHA-1 hash names
- **Metadata**: File thumbnails linked via `fd-thumbnail` custom metadata

### Error Handling
- **Upload failures**: Client-side retry logic with visual feedback
- **WebDAV errors**: Standard HTTP status codes (404, 401, 207, etc.)
- **Authentication errors**: Login form shows error messages, logout on auth failure
- **Session expiry**: Automatic redirect to login when credentials become invalid
