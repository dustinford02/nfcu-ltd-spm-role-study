# NFCU role study

A phone-friendly study system for the Navy Federal Credit Union Senior Program Manager (Learning & Talent Development), requisition 32372. It connects the actual posting to 24 role drills, a topic map, source references, and bounded personal career practice.

**Not affiliated with, endorsed by, or an official product of Navy Federal Credit Union.** Practice prompts are not official interview questions. No interview format or internal employer policy is known from this work.

## Public edition

The owner selected publication without sign-in on September 27, 2026. Anyone who receives the URL can read the included career fragments. A public repository is also publicly accessible; a link is not an access control. The app requests search-engine exclusion, which is not a privacy guarantee.

The original role-only specification was amended by direct user instructions to include personal career material and publish for anyone with the link. These amendments supersede its biography and publication prohibitions for this new repository only. Existing applications remain outside scope.

Ten career cards retain source type, period, attribution limits, and a practice prompt. User testimony is labeled USER_STATEMENT; issuer-document copies are labeled ISSUER_RECORD_COPY. The original documents, local paths, private claim ledger, contract details under disclosure holds, contact identifiers, and recordings are absent. Academic work and an unpiloted personal framework are not represented as employer results. No new resume accomplishment bullets were synthesized.

## Use

- Start with the next three-minute drill, then open a topic or practice a career example.
- **Show posting only** restricts study content to retrieved posting material; analysis and personal practice remain available when switched off.
- Use the 3 / 10 / 25-minute timer. Rehearse aloud or silently; this release does not record audio or generate AI scores.
- After one successful online visit, the service worker offers cached practice. Installation depends on the browser's usual install or Add to Home Screen control.
- Progress is stored in this browser. Export and import a progress file to move it between devices. There is no automatic cloud sync, account, or shared progress database.
- Browser storage can be cleared or evicted. Export progress periodically. No analytics, external fonts, paid APIs, or AI subscription are required.

## Sources and meanings

| Class | Meaning |
|---|---|
| posting | Retrieved job-posting text or its explicitly sourced metadata |
| employer_public | Employer or official-partner public information; vendor claims remain vendor-reported |
| industry | General practice, not NFCU policy |
| inference | Editorial implication with an `inferred_from` reference |
| unknown | Not established by the reviewed sources |
| prep_drill | A practice suggestion, never an official interview question |
| workspace_meta | Study-system metadata, source inventory, or workspace reference |
| candidate_material | A personal-practice container with separately classified facts |
| candidate_fact | A bounded candidate fact with its evidence classification and period |

The saved PDF's general program-management overview differs from the currently retrieved talent/performance overview. Both are preserved. The official page confirms Job Identification 32372. `content/posting/diff.md` also records changed closing dates and the mismatch between degree wording and structured metadata. “Current” means retrieved on the recorded date, not a promise that a vacancy remains open.

Full posting captures are retained for personal study and traceability. Third-party quotes and material retain their owners' rights and are not relicensed by the MIT license. A rights-holder can request removal through the repository owner. The MIT license covers the code and original study text only; it does not confer endorsement or rights in personal source documents.

## Build, validate, preview

Requires Node.js with standard-library ES modules. There are no npm dependencies.

```sh
node tools/build-content.mjs
node tools/validate.mjs
node tools/test-validation.mjs
node tools/serve.mjs
```

Open `http://127.0.0.1:8766/nfcu-ltd-spm-role-study/`. Use HTTP rather than a local file URL for offline acceptance. The server listens only on loopback. Stop it with Ctrl+C.

`content/` and `schema/` are the source of truth. The build deterministically creates `app/data/content.json` and `content.sha256`, including source-file hashes. Do not edit generated files. The validator checks schema/provenance rules, captured text, exact rebuild equality, hashes, topic/drill links, required unknowns, candidate boundaries, and private-path/credential patterns. It cannot authenticate an issuer or prove every statement true; source review remains necessary.

`content/gaps/validation-log.md` is a derived validation transcript and is deliberately excluded from the content digest to prevent a self-referential hash. Its frontmatter is still validated. Other source documents, including the self-pass, are part of the build.

## Publishing this authorized edition

After local acceptance:

```sh
node tools/export-pages.mjs
```

This copies only `app/` into generated `docs/`, writes a manifest, then validates both the source build and every exported byte. A failed validation exits nonzero and must block publication. GitHub Pages can publish `main` → `/docs`. Keep `docs/` generated; never patch it by hand. GitHub's [publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) describes this branch configuration. No custom domain or paid hosting is required for a public GitHub repository.

Do not upload the sibling private intake report, the wider Career and Job History workspace, or any original source document. Publish only this repository after the checks pass.

## Claude Project review

These are UI steps, not an instruction to connect an account automatically:

1. Open a Claude Project.
2. Choose to add content from GitHub.
3. Select `nfcu-ltd-spm-role-study` on the intended branch.
4. Select `content/`, `schema/`, and `AGENTS.md`.
5. Refresh the GitHub sync after every merge, before a new review.
6. Ask: “List unlabeled claims, unmapped posting sentences, and file-level patches. Do not invent NFCU policy or strengthen candidate claims.”

The GitHub integration syncs file names and contents on a selected branch; it is not a review of the live Pages DOM, pull requests, or issues. See [Claude's GitHub integration documentation](https://support.claude.com/en/articles/10167454-use-the-github-integration), checked September 27, 2026. Availability and connection status in the owner's Claude account have not been verified.

## What remains unknown

Talent Philosophy and Leadership Model text; calibration owner/rubric; cycle operation versus program governance; system of record for this specific role; reporting seat and org design; interview format. Oracle's customer story does not resolve those role-specific questions. See the source-linked map and `content/unknowns.md`.
