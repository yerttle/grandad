# Working on Grandad's Cold Snap

A 3D family board game that runs in the browser with nothing to install. `README.md` explains how it plays and what's in each file.

## Pull requests

Every pull request must come with a playable test build, so it can be tried on a phone or laptop without checking out the branch. Before you open a PR:

1. Build the page from the branch you're about to open the PR from:

   ```bash
   node tools/build-artifact.js
   ```

   This writes `build/artifact.html` (the folder is git-ignored) and prints the supporting files to publish with it.

2. Publish it as a claude.ai Artifact with the Artifact tool. Use `build/artifact.html` as the page and pass the printed list as `files`: every script in `js/` and `vendor/three.min.js`, at the same paths.

3. Put the artifact's link in the PR description under a **Test build** heading, with a line or two on what to try.

4. When you push more commits to the PR, rebuild and republish to the same artifact URL, so the link always plays the latest commit on the branch.

Don't open the PR without the link. If you can't publish an artifact, say so in the PR description and tell the person you're working with.

If a change touches the economy (stall payouts, prices, the board squares or the extras), re-run `node tools/simulate.js` and update the round limits in `js/core.js` and the README to match.
