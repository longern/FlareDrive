# FlareDrive

Cloudflare R2 storage manager with Pages and Workers. Free 10 GB storage. Free serverless backend with a limit of 100,000 invocation requests per day. [More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Features

- Drag-and-drop upload
- Upload large files
- Create folders
- Search files
- Image/video thumbnails
- WebDAV endpoint

## Usage

### Installation

Before starting, you should make sure that

- you have created a [Cloudflare](https://dash.cloudflare.com/) account
- your payment method is added
- R2 service is activated and at least one bucket is created

Steps:

1. Fork this project and connect your fork with Cloudflare Pages
2. Add a custom domain
3. Bind your R2 bucket to `BUCKET` varaible
   - Set `WEBDAV_USERNAME` and `WEBDAV_PASSWORD` to enable WebDAV endpoint (`/webdav`)
   - (Optional) Set `WEBDAV_PUBLIC_READ` to enable public read access
4. Manually redeploy to make R2 bindings take effect

### Authentication

There is no built-in authentication support. By default everyone can read and write your storage. But Cloudflare Zero Trust can be used to protect your data. Do these steps to enable authentication:

1. Enable Cloudflare Zero Trust
2. In **Access**->**Applications**, create a self-hosted application
3. Set **Path** as `api/write/` to disable public write or leave it blank to disable public read
4. Create a policy which accepts your email only

## Acknowledgments

WebDAV related code is based on [r2-webdav](
  https://github.com/abersheeran/r2-webdav
) project by [abersheeran](
  https://github.com/abersheeran
).
