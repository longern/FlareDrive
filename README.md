# FlareDrive

Cloudflare R2 storage manager with Pages and Workers. Free 10 GB storage.
Free serverless backend with a limit of 100,000 invocation requests per day.
[More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Features

- Drag-and-drop upload
- Upload large files
- Create folders
- Search files
- Image/video/PDF thumbnails
- WebDAV endpoint

## Usage

### Installation

Before starting, you should make sure that

- you have created a [Cloudflare](https://dash.cloudflare.com/) account
- your payment method is added
- R2 service is activated and at least one bucket is created

Steps:

1. Fork this project and connect your fork with Cloudflare Pages
2. Bind your R2 bucket to `BUCKET` varaible
   - Set `WEBDAV_USERNAME` and `WEBDAV_PASSWORD` in `Settings`->`Functions`->`Environment Variables`
   - (Optional) Set `WEBDAV_PUBLIC_READ` to enable public read access
3. Retry deployment in `Deployments` page to apply the changes
4. (Optional) Add a custom domain

### Authentication

There is no built-in authentication support.
By default everyone can read and write your storage.
But Cloudflare Zero Trust can be used to protect your data.
Do these steps to enable authentication:

1. Enable Cloudflare Zero Trust
2. In **Access**->**Applications**, create a self-hosted application
3. Set **Path** as `api/write/` to disable public write or leave it blank to disable public read
4. Create a policy which accepts your email only

### WebDAV endpoint

You can use any client (such as [BD File Manager](https://play.google.com/store/apps/details?id=com.liuzho.file.explorer))
that supports the WebDAV protocol to access your files.
Fill the endpoint URL as `https://<your-domain.com>/webdav` and use the username and password you set.
However, the standard WebDAV protocol does not support large file (≥128MB) uploads due to the limitation of Cloudflare Workers.
You must upload large files through the web interface which supports chunked uploads.

## Acknowledgments

WebDAV related code is based on [r2-webdav](
  https://github.com/abersheeran/r2-webdav
) project by [abersheeran](
  https://github.com/abersheeran
).
