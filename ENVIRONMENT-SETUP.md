# Environment Setup - EasyRyde

**Date:** 2026-07-19
**System:** Ubuntu 26.04 LTS (Resolute)

---

## Installation Summary

| Tool | Version | Status |
|------|---------|--------|
| PHP | 8.5.4 (cli) | Installed |
| Composer | 2.10.2 | Installed |
| Docker | 29.1.3 | Installed |
| Docker Compose | 2.40.3 | Installed |

---

## PHP 8.5.4

- **Binary:** `/usr/bin/php8.5`
- **Extensions installed:**
  - bcmath, curl, dom, gd, intl, mbstring, pgsql, redis, xml, zip
- **OPcache:** Enabled (Zend OPcache v8.5.4)
- **Note:** PHP 8.5 was installed from Ubuntu 26.04 default repos (exceeds 8.2+ requirement). The `ondrej/php` PPA is not needed for this release.

## Composer 2.10.2

- **Binary:** `/usr/local/bin/composer`
- **Installed via:** Official installer

## Docker 29.1.3

- **Service:** Active and enabled on boot
- **Docker Compose:** 2.40.3 (bundled)
- **Note:** User `madoc-hp` must log out and back in for docker group membership to take effect (or run `newgrp docker`).

---

## Notes

1. The `ondrej/php` PPA does not support Ubuntu 26.04 (Resolute). PHP packages are now available directly from Ubuntu repos.
2. Docker was installed via `docker.io` package (Ubuntu's Docker package).
3. To run Docker without sudo after re-login:
   ```bash
   newgrp docker
   docker run hello-world
   ```
