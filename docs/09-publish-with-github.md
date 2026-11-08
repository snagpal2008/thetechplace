# 09 · Publish with GitHub (free): GitHub Pages + Google Sheets

This is the **recommended, simplest setup**. It needs only GitHub and the funeral home's Google account. No other accounts, tokens or servers.

```
 you edit on GitHub ──► merge to master ──► GitHub Actions: test + build ──► GitHub Pages (live site)
                                                                                    │ forms
                                                                                    ▼
                                         Google Apps Script ──► Google Sheet (database) + Gmail alert
```

| Part | Where | Cost |
|---|---|---|
| Website | https://snagpal2008.github.io/thetechplace/ | Free |
| Auto-publish | `.github/workflows/deploy-pages.yml`: every change to `master` is tested, built and live in about 1 minute | Free |
| Database | A Google Sheet, one tab per form | Free |
| Alerts | Email to `alertEmail` in `site/config.json` (snagpal2008@gmail.com) | Free |

## Step 1: Turn on GitHub Pages (one click, once)

Go to the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then **Actions → Publish website → Run workflow** (or just merge any change). After about a minute the site is live at **https://snagpal2008.github.io/thetechplace/**.

## Step 2: Create the forms database (about 10 minutes, once)

1. Go to **sheets.new** (signed in as snagpal2008@gmail.com) and name the sheet "Website forms".
2. In the sheet, go to **Extensions → Apps Script**. Delete what's there, paste the **whole** of `tools/apps-script/Code.gs`, and click **Save**.
3. In the function list at the top choose **setup** and click **Run**. Allow the permissions. (Google warns because it's your own script: *Advanced → Go to … (unsafe) → Allow*.)
4. **Deploy → New deployment → ⚙ → Web app**, with *Execute as: Me* and *Who has access: Anyone*. Click **Deploy**.
5. Copy the **Web app URL** (it ends in `/exec`). Put it in `site/config.json` as `"formsEndpoint"` and merge, or give it to Claude.
6. Optional: in Apps Script choose **testAlert** and click **Run** to check that an email arrives.

## Daily use

- **New forms:** an email arrives (🔴 URGENT for deaths and call-backs, with the caller's name and phone). The full details are in that form's tab in the Sheet.
- **Work the queue:** set the `status` column to `contacted` or `closed`.
- **Condolences:** change `status` from `pending` to `approved` to publish a message on the notice page, or `rejected` to hide it.
- **Old data** is deleted automatically every night, following the retention periods in `site/forms.mjs`.

## Making changes

Edit files on GitHub (or ask Claude), merge to `master`, and the site updates by itself. If you change form fields in `site/forms.mjs`, run `npm run apps-script` in `site/`. It regenerates `Code.gs`, and the publish workflow checks that it was done. Then paste the new `Code.gs` into Apps Script and choose **Deploy → Manage deployments → ✎ → New version**. The URL stays the same.

## Your own domain later (about €10–30 a year)

1. Buy the domain (for a `.ie`, from an IE Domain Registry-accredited registrar).
2. In your registrar's DNS settings, add a `CNAME` record for `www` pointing to `snagpal2008.github.io`, plus GitHub's `A` records for the bare domain (listed at docs.github.com, "Managing a custom domain for your GitHub Pages site").
3. Create the file `site/CNAME` containing just `www.your-domain.ie`, and set `"domain": "https://www.your-domain.ie"` in `site/config.json`. Merge.
4. **Settings → Pages → Custom domain:** enter it and tick **Enforce HTTPS**. HTTPS is free.

## Notes

- When everything in `site/config.json` is real, set `"preview": "false"` so search engines can list the site.
- Security: GitHub Pages can't send custom headers, so the Content-Security-Policy is a `<meta>` tag in every page. Form values are validated again in Apps Script with the same rules as `site/forms.mjs`. Cells that would run as spreadsheet formulas are neutralised, and condolence emails are never published.
- The Cloudflare + SQLite setup (`docs/08-hosting.md`) still works if you ever want it, but you don't need it.
