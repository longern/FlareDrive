# FlareDrive

CloudFlare R2 storage manager with Pages and Workers. Free 10 GB storage. Free serverless backend with a limit of 100,000 invocation requests per day.

## Usage

1. Fork this project
2. Connect your fork with CloudFlare
3. Add a custom domain (e.g. mydrive.domain.com)
4. Add R2 buckets. Set variable name as subdomain prefix (e.g. `mydrive`)
5. Manually redeploy to make R2 bindings take effect.
