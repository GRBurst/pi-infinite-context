# Publishing

Successful pushes to `main` publish `pi-infinite-context` to npm through
`.github/workflows/ci.yml`. Pull requests and other branches only run checks.
The `pi-package` keyword makes the npm package discoverable in the
[Pi package index](https://pi.dev/packages).

## One-time setup

1. From `main`, publish the initial repository version with your npm account:

   ```bash
   nix develop
   npm ci
   npm run ci
   npm run e2e
   npm pack --dry-run
   npm login
   npm publish --access public
   ```

   npm requires two-factor authentication for interactive publishing.
   Review the file list before uploading. The initial version is `0.1.0`.

2. Open the package's **Settings → Trusted Publisher** on npmjs.com and add
   **GitHub Actions** with:

   - Organization or user: `fdietze`
   - Repository: `pi-infinite-context`
   - Workflow filename: `ci.yml`
   - Environment name: leave empty
   - Allowed actions: enable **npm publish**; dist-tag management is not needed

   No npm token or GitHub secret is needed. Configure this after the workflow
   exists on GitHub. The first successful CI publish must happen within two days
   of creating the publisher, or npm expires the configuration.

3. Push a commit to `main`, or rerun its failed publishing job, and verify the
   package and installation:

   ```bash
   pi install npm:pi-infinite-context
   ```

4. After CI publishing works, select **Require two-factor authentication and
   disallow tokens** in the package's publishing-access settings.

See [npm's trusted-publishing documentation](https://docs.npmjs.com/trusted-publishers/).
GitHub-hosted runners are required. OIDC publishing also provides automatic
provenance for this public repository and package.

## Versions and ordering

The repository version supplies the major and minor numbers and must end in
`.0`. CI replaces the patch number with `GITHUB_RUN_NUMBER`, only in its own
checkout. For example, repository version `0.1.0` and workflow run 42 produce
`0.1.42`. No version commits or Git tags are created. Workflow runs on other
branches and pull requests create harmless gaps in the published versions.

Change the repository version to `0.2.0` or `1.0.0` (and update the lockfile)
when an intentional minor or major release is needed. Keep the workflow filename
`ci.yml`: its counter must not reset within the same major/minor series.

Publishing jobs are serialized with GitHub's `queue: max` (up to 100 pending
jobs). Since checks may complete out of order, the script compares versions
inside that queue: newer versions publish as `latest`; older versions still
publish, but under `snapshot`, without moving `latest` backwards. `snapshot`
is not a release channel and does not promise a particular version.
This ordering protection assumes CI is the sole publisher after setup.

The script packs once and publishes that exact tarball. Rerunning a release is a
no-op only when the published tarball's integrity matches. A version collision
with different contents, or a registry failure other than a structured 404,
stops the job. Published npm versions are immutable.

## Implementation

- `.github/workflows/ci.yml`: checks, branch restriction, publishing queue and OIDC permissions.
- `scripts/publish.ts`: CI-only versioning, packaging, retry checks and release-tag selection.
- `scripts/publish.test.ts`: publishing behavior without registry writes.
- `scripts/package.test.ts`: the real npm package file list.
- `package.json` → `files`: package allowlist.
- `extensions/infinite-context/.npmignore`: test exclusions within the allowed extension directory.

All jobs use the pinned Nix toolchain. The check job installs dependencies and
runs tests once; the publishing job needs only npm and ships TypeScript sources.
