# FlareDrive

CloudFlare R2 storage manager with Pages and Workers. Free 10 GB storage. Free serverless backend with a limit of 100,000 invocation requests per day. [More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Usage

Before starting, you should make sure that

* you have created a [CloudFlare](https://dash.cloudflare.com/) account
* your payment method is added
* R2 service is activated and at least one bucket is created

Steps:

1. Deploy this repo to CloudFlare Pages. Do one of these:
    * Fork this project and connect your fork with CloudFlare Pages
    * Download ZIP and upload the directory in the archive (DO NOT upload the archive directly)
2. Add a custom domain (e.g. `mydrive.domain.com`)
3. Bind R2 buckets. Set variable name as subdomain prefix (e.g. `mydrive`)
4. Manually redeploy to make R2 bindings take effect.
