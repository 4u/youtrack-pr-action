# 4u/youtrack-pr-action@v1

Small action to change youtrack issue by [YouTrack Search API](https://www.jetbrains.com/help/youtrack/standalone/Search-and-Command-Attributes.html) and [YouTrack Command API](https://www.jetbrains.com/help/youtrack/standalone/Command-Reference.html).

## How to use

1. Issue Youtrack Permanent Token and set it to `YOUTRACK_TOKEN` secret.
2. Set `YOUTRACK_BASE_URL` secret, e.g. `https://mycompany.myjetbrains.com/youtrack`
3. Create your workflow and use `4u/youtrack-pr-action@v1` action, e.g. `.github/workflows/review-requested.yml`:

```
name: Review Requested

on:
  pull_request:
    types: [review_requested]
jobs:
  review-requested:
    runs-on: ubuntu-latest

    steps:
      - name: 'set code review state'
        uses: 4u/youtrack-pr-action@v1
        with:
          if: 'State: Open, Backlog'
          github_token: ${{ github.token }}
          token: ${{ secrets.YOUTRACK_TOKEN }}
          base_url: ${{ secrets.YOUTRACK_BASE_URL }}
          command: State Code Review
```

Action uses GitHub API to get commit data, so don't need to checkout your project files.

## How action workds

1. Action will find all YouTrack issue IDs (e.g. ABC-123) in your commit messages and PR title. Action will grab commits from pull request if it exists, otherwise will use `commit.sha`.
2. By ` if: 'State: Open, Backlog'` action will filter issues.
3. Action will apply the command `State Code Review` to change issue state.

## Parameter `if`

For `if: 'State: Open, Backlog'` parameter action uses [YouTrack Search API](<(https://www.jetbrains.com/help/youtrack/standalone/Search-and-Command-Attributes.html)>). For example, we have 2 commits in PR:

```
commit a3beaa4e2a158242b0c08d4a4d5011bfdd63ca3a
Author: Max Nikitin <max@rururu.me>
Date:   Sat Mar 1 03:32:54 2022 +0300

    AB-1 fix foo

commit bae1eb35165aaca73da1413a5e95d609842bc130
Author: Max Nikitin <max@rururu.me>
Date:   Sat Mar 1 03:30:23 2022 +0300

    AB-2 fix bar
```

Action will build search query `(issue id: AB-1 or AB-2) and (State: Open, Backlog)`.

**NB! Action does not use pagination for search, only fist 100 issues (i hope) will be updated.**

## Parameter `command`

For filtered issues acion uses [Command API](https://www.jetbrains.com/help/youtrack/standalone/Command-Reference.html). It's pretty similar to search language, but with little diffrences. For example, to force state to open you can use `State Open`. You can change any issue field by command, not only state.

## Parameters `base` and `head`

By default action will find commits with changes automatically, so you dont need to use it, But if you really want you can set the range of commits by `base` and `head` parameters, just set commits SHA into it. It works via API described in [github documentation](https://docs.github.com/en/rest/reference/commits#compare-two-commits).
