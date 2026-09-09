# Launch runbook

Written 8 September 2026, for the launch on the 9th. Every step is either a
command to run here or a click in a web interface, in the order they have to
happen. The blocking decisions sit at the foot; nothing above them waits on
anything except the step before it.

## Where things stand tonight

- 59 commits on `main`, **nothing pushed** — `origin/main` has no ref.
- **The GitHub repository does not exist.** `git remote -v` points at
  `github.com/RogerPielkeJr/scenarios`, which returns 404. The remote was
  configured and the repository never created.
- `.github/workflows/deploy.yml` is written and runs typecheck, tests, build,
  then deploys through the Pages action. It has never run.
- `dist/CNAME` carries `scenarios.thehonestbroker.org`.
- **DNS resolves already, but only by wildcard.** `scenarios.thehonestbroker.org`
  answers with the GitHub Pages addresses, and so does
  `randomtest-1788894681.thehonestbroker.org`, which is how we know it is a
  wildcard rather than a record for this subdomain. Decarbonization has a real
  CNAME to `rogerpielkejr.github.io`; this should match it.
- The audit is clean: 349 vitest tests and 92 Playwright tests, typecheck, twelve pages with no console errors,
  no 4xx, no overflow from 360 to 1440 pixels, dark mode at 15.3:1, every
  internal link resolving, every external link either resolving or blocked to
  robots but live in a browser.

## Part 1 — the site itself

0. **Rebuild what is generated**, in this order, and commit whatever moves:
   `python3 scripts/build_data.py`, `python3 scripts/build_carried_data.py`,
   `python3 scripts/build_removal.py`, `python3 scripts/build_timing.py`,
   `python3 scripts/build_sitemap.py`, then `npm run build:pdf`. The
   methodology PDF is built from METHODOLOGY.md, METHODS.md and DATA.md and is
   the one artefact no test can check on a runner, because reading its text
   needs a binary CI does not have. `tests/presets.test.ts` checks that those
   documents still state the figures the model produces, so a stale document
   fails the suite; a stale PDF does not, and this step is what prevents one.
   Its build is not byte-reproducible, so `git status` alone says nothing.

1. **Create the repository.** `gh repo create RogerPielkeJr/scenarios --public
   --source=. --remote=origin --push` creates it and pushes `main` in one step.
   The token here carries `repo` and `workflow`, which is enough. Public,
   matching decarbonization: GitHub Pages on a free plan serves only from public
   repositories.
2. **Watch the first Actions run.** `gh run watch` — it runs typecheck, the 325
   tests, the build, then deploys. This is the first time CI has ever run on this
   repository, so treat a failure as a CI-environment difference rather than as a
   code problem: everything passes here on Node 22.14.
3. **Point Pages at the workflow.** Settings → Pages → Build and deployment →
   Source: GitHub Actions. Decarbonization deploys from a branch; this one
   deploys from the workflow, so the setting differs from the site you last set
   up.
4. **Set the custom domain** to `scenarios.thehonestbroker.org` in the same
   panel, and tick Enforce HTTPS once it offers it.
5. **Add the DNS record at Cloudflare.** A CNAME, `scenarios` →
   `rogerpielkejr.github.io`, **DNS only, grey cloud** — the same shape as
   decarbonization and globalextremeweather. The wildcard would serve the site
   without this, but a specific record is what GitHub verifies against, and the
   proxied orange cloud breaks Pages certificates.
6. **Wait for the certificate.** GitHub provisions it after the domain verifies;
   minutes usually, up to an hour. Until it lands the site answers on HTTP and
   the browser warns on HTTPS. Check with
   `curl -sSI https://scenarios.thehonestbroker.org | head -1`.
7. **Verify the live site**, not the build: load the dashboard, one Learn More
   page, the library and the bibliography; click a preset; download the PNG;
   copy a share link and open it in a private window.

## Part 2 — thehonestbroker.org

Both live in `~/thb-empire-cron`, which is clean and in sync. Everything on that
site is generated, so edit `scripts/build_home.py` and rebuild — never the HTML.

8. **Data Projects.** Add an entry to `DATA_PROJECTS` beside the other four. It
   feeds the cards on the homepage, the nav dropdown and the /speaking/ page from
   one list. Off-site the tool is called **THB Build your own climate scenario**.
9. **What's New.** The box reads `data/whats_new.json`, refreshed nightly by
   `scripts/refresh_whats_new.py` from each project's live data. The other
   columns carry a number that moves — ACE year to date, a drought percentage, a
   country's decarbonization rate. This tool has no daily number, so it needs a
   decision: a fixed entry that always points at the tool, or a computed line.
   See the decisions below.
10. **Rebuild and check** with `python3 scripts/build_home.py`, which rewrites
    index, books, press, speaking and gtc together.
11. **Push**, and confirm the item is live on all the pages it feeds.

## Part 3 — Decarbonization Around the World

`~/decarbonization` has one unpushed commit, `3a3721b`, which cross-links the
scenario builder from all four pages' nav. Those links already point at
`scenarios.thehonestbroker.org`, so they start working the moment Part 1 lands.

12. **Rename the links.** They read "Scenario Builder" in the nav and "THB
    Scenario Builder" in the methodology prose. The tool is now *Build your own
    climate scenario*, and off its own site it takes the THB prefix.
13. **Add the prominent button near the top**, which the nav link does not
    provide.
14. **Deal with the uncommitted CSS change** in `assets/site.css`: axis labels
    move from 15px muted to 19px primary. It is not mine and it is not committed.
15. **Push** `3a3721b` and whatever Parts 12–14 add.

## Part 4 — after launch

16. Confirm HTTPS, the certificate, and that `http://` redirects to `https://`.
17. Load the site on a phone.
18. Check the social card: paste the URL into a Slack or Substack draft and
    confirm the card renders rather than a grey box.
19. `curl -s https://scenarios.thehonestbroker.org/sitemap.xml` and confirm all
    twelve URLs answer 200 on the live domain. `scripts/build_sitemap.py`
    derives the list from vite's entry points and `tests/sitemap.test.ts` holds
    the two together, so the count follows the pages rather than a hand edit.

## Decisions, and where they landed

Answered on the evening of the 8th:

- **The feedback link** arrives tomorrow. `FEEDBACK_URL` in
  `src/ui/toolbar.ts` still reads `https://rogerpielkejr.substack.com`; it takes
  the launch post's own URL before the push. **This is a launch-morning step,
  not an optional one:** shipping without it points every reader who wants to
  report an error at the Substack front page.
- **What's New** carries a fixed button reading **NEW THB Climate Scenario
  Tool**, not a computed column. It needs no nightly refresh, so it goes in
  `build_home.py` beside the project list rather than in
  `refresh_whats_new.py`.
- **The two missing Learn More pages get built** — timing and removal. Not
  started; see the note below.
- **The Stevenson and Pielke citation** is fixed: 2015, not 2018, at the CU
  Boulder Center for Science and Technology Policy Research, which serves the
  PDF at `sciencepolicy.colorado.edu/admin/publication_files/2015.32.pdf`. The
  file number itself carries the year.

Still standing:

- **Public repository.** Free Pages serves only from public repositories, so the
  source and its history go public with the site.

## The two Learn More pages, before anyone writes them

Research done, nothing built. One finding shapes the work and needs settling
first, because it is a correctness problem rather than a gap:

**The land use page still owns engineered removal, and says it has to.** Its
builder carries an "Engineered removals in 2100" control, and its prose reads
"In this tool it goes on this slider, because a product of four positive factors
cannot go below zero." That stopped being true when the removals slider arrived.
A reader can now set removal on the land use page *and* on the removals slider
and count it twice.

So the removal page does not just fill a gap: it takes that control over, the
land use builder loses it, and that paragraph gets rewritten to point at the new
page. Deployment figures for it come from the State of Carbon Dioxide Removal
(Smith et al., stateofcdr.org), whose June 2026 executive summary downloads
cleanly: about 2 GtCO₂ a year today, almost all of it conventional land-based,
against roughly 0.002 GtCO₂ a year from the novel and durable methods.

The timing page needs no new data. The site already carries the observed energy
intensity series, 1965 to 2024, and the fuel mix series behind it, both from the
Energy Institute and the World Bank, and the timing share is computable from
them: how much of the century's improvement the world has actually delivered
early against late. Each marker's own timing value already sits in
`presets.json`, derived in `build_carried_data.py`.
