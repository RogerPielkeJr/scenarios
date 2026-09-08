# Launch runbook

Written 8 September 2026, for the launch on the 9th. Every step is either a
command to run here or a click in a web interface, in the order they have to
happen. The blocking decisions sit at the foot; nothing above them waits on
anything except the step before it.

## Where things stand tonight

- 49 commits on `main`, **nothing pushed** — `origin/main` has no ref.
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
- The audit is clean: 325 tests, typecheck, eleven pages with no console errors,
  no 4xx, no overflow from 360 to 1440 pixels, dark mode at 15.3:1, every
  internal link resolving, every external link either resolving or blocked to
  robots but live in a browser.

## Part 1 — the site itself

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
    ten URLs answer 200 on the live domain.

## Decisions before any of this runs

- **The feedback link.** `FEEDBACK_URL` in `src/ui/toolbar.ts` still points at
  `https://rogerpielkejr.substack.com`. It was always meant to move to the
  launch post's own URL on the day, which needs that URL.
- **What's New: what does it say?** Every other column carries a number that
  changes. Options: a fixed entry naming the tool; or a computed one, which needs
  a quantity worth recomputing nightly.
- **Two sliders still have no Learn More page.** Timing and removal. Six of eight
  have one. Launch as is and add them, or hold.
- **The Stevenson and Pielke citation** in the bibliography gives 2018 and links
  a Semantic Scholar mirror that now answers 202 with HTML rather than the PDF.
  Published sources put it at 2015, written 2012. It is your paper: the year and
  a stable link both need you.
- **Public repository.** Free Pages serves only from public repositories, so the
  source and its history go public with the site.
