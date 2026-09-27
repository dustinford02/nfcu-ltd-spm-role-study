# Publish the authorized public edition

Run from this repository's root after installing the official GitHub CLI if it is not already available. These commands are a fallback when the browser is unavailable, not a claim that a remote repository already exists.

```powershell
node tools/build-content.mjs
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
node tools/export-pages.mjs
if ($LASTEXITCODE -ne 0) { throw 'Release validation failed' }
node tools/test-validation.mjs
if ($LASTEXITCODE -ne 0) { throw 'Rejection tests failed' }
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Complete gh auth login before publishing' }
$studyAccount = gh api user --jq .login
if ($studyAccount -ne 'dustinford02') { throw 'Wrong GitHub account' }
gh repo create dustinford02/nfcu-ltd-spm-role-study --public --source . --remote origin --push --description 'Source-led Learning and Talent Development role study and bounded career practice'
if ($LASTEXITCODE -ne 0) { throw 'Repository creation or push failed; inspect before retrying' }
gh api --method POST repos/dustinford02/nfcu-ltd-spm-role-study/pages --input tools/pages-config.json
if ($LASTEXITCODE -ne 0) { throw 'Pages configuration failed; inspect the response' }
gh api repos/dustinford02/nfcu-ltd-spm-role-study/pages --jq '{status: .status, url: .html_url, source: .source}'
```

The local initial commit must exist before `gh repo create --push`. The prepared release has an initial commit; for subsequent local edits, validate and commit the intended changes first. Do not force-push or overwrite an existing repository if creation reports a name conflict.

Wait for GitHub's Pages build to finish, then open the returned `html_url`. Verify the actual live page, its 9/24/10 content counts, career source labels, filter, timer, and first-load/offline behavior. A successful push or Pages configuration alone does not prove a live site is serving correctly.

Browser alternative: create the new public repository under `dustinford02`, push the local release, then Settings → Pages → Deploy from a branch → main → /docs → Save. Do not publish the parent workspace or the sibling private intake file.

References checked September 27, 2026: [GitHub CLI repo create](https://cli.github.com/manual/gh_repo_create), [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Pages REST API](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site).
