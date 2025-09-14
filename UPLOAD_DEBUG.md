# FlareDrive Upload Debug Guide

## Debug Improvements Added

### 1. Enhanced Logging Throughout Upload Flow

#### Upload Manager (uploadManager.ts)
- Logs when uploads are added with their IDs
- Logs status changes for each upload
- Logs progress updates with detailed upload info

#### Transfer Module (transfer.ts)  
- Logs when `processUploadQueue` is called with queue length
- Logs each file being processed with uploadId and manager status
- Logs actual upload start
- Logs XHR requests with URLs
- Logs upload progress events in XHR
- Logs response status and errors
- Enhanced error messages for failed uploads

#### Main Component (Main.tsx)
- Logs upload manager creation
- Detailed logging of upload progress updates with:
  - Upload count
  - Each upload's ID, filename, status, and progress
- Logs when component mounts with manager status

#### FloatingUploadProgress Component
- Logs render events with upload count and visibility
- Detailed logging of each upload's state
- Logs when component is hidden/shown

#### UploadDrawer Component  
- Logs when files are added from drawer with IDs
- Logs upload manager availability

### 2. Test Upload Button

When running on localhost, a green "Test Upload UI" button appears in the bottom-left corner. This button:
- Creates a test file
- Adds it to the upload manager
- Should trigger the FloatingUploadProgress to appear
- Helps verify if the UI component is working independently of actual uploads

### 3. How to Debug Upload Issues

Open browser Developer Tools (F12) and check the Console tab for:

1. **Upload Manager Initialization**
   - Look for: "Creating upload manager instance"
   - Confirms manager is ready

2. **File Selection**
   - Look for: "Added upload from drawer: [filename] with ID: [id]"
   - Confirms files are being added to manager

3. **Queue Processing**
   - Look for: "processUploadQueue called, queue length: [n]"
   - Should show non-zero queue length
   - Look for: "Processing upload: [filename]"

4. **Upload Progress**
   - Look for: "XHR upload progress: [loaded] / [total]"
   - Should show increasing loaded values
   - Look for: "Upload progress update - count: [n]"
   - Should show uploads with changing progress

5. **UI Visibility**
   - Look for: "FloatingUploadProgress render - uploads: [n]"
   - Should show non-zero upload count
   - Look for: "Uploads in FloatingProgress:" followed by upload details

6. **Network Activity**
   - Check Network tab for PUT requests to `/webdav/[filename]`
   - Check response status (should be 200-299 for success)

### 4. Common Issues and Solutions

#### Issue: FloatingProgress doesn't appear
**Check:**
- Console for "Upload progress update - count: 0"
- If count is 0, uploads aren't being added to manager
- Test with the green "Test Upload UI" button

#### Issue: Upload starts but no progress
**Check:**
- Network tab for stalled requests
- Console for "XHR request error" or status errors
- Authentication headers in requests

#### Issue: Upload completes but UI doesn't update
**Check:**
- Console for "Upload completed: [id]"
- Console for status transition logs
- FloatingProgress visibility logs

### 5. Quick Test Procedure

1. Open the app in browser
2. Open Developer Tools (F12) > Console
3. Click the green "Test Upload UI" button (localhost only)
4. Check if FloatingUploadProgress appears
5. If it appears, try uploading a real file
6. If it doesn't appear, check console for upload manager logs

### 6. Authentication Issues

If uploads fail with 401/403 errors:
- Check `getAuthHeaders()` is returning correct headers
- Verify authentication token in localStorage
- Check Network tab for authorization headers in requests

### 7. File Size Issues

- Files < 100MB use single PUT request
- Files >= 100MB use multipart upload
- Check console for "multipart" vs regular upload logs

## Next Steps if Issues Persist

1. Check server logs for upload endpoints
2. Verify CORS settings if cross-origin
3. Test with small text files first
4. Check browser console for any uncaught errors
5. Verify WebDAV endpoint is accessible
6. Test upload endpoints manually with curl/Postman