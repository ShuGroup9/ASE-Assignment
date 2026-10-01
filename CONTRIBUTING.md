# Contributing

## Branches

| Branch       | Purpose                                   | Branched from | Merges into              |
|--------------|-------------------------------------------|---------------|--------------------------|
| `master`     | Production. Every commit is a release.    | -             | -                        |
| `develop`    | Integration branch. Default branch.       | -             | `master`                 |
| `feature/*`  | New features                              | `develop`     | `develop`                |
| `bugfix/*`   | Non-urgent fixes                          | `develop`     | `develop`                |
| `release/*`  | Release prep (version bump, final fixes)  | `develop`     | `master`, then `develop` |
| `hotfix/*`   | Urgent production fixes                   | `master`      | `master`, then `develop` |

Nobody pushes to `master` or `develop` directly; everything goes through a pull request. Branches with any other prefix can't be created on GitHub.

Use short, lowercase, hyphenated names, optionally with an issue number:
`feature/example_page`, `bugfix/math-rounding`, `release/1.0.1`.

## Day-to-day workflow

```bash
git switch develop && git pull
git switch -c feature/example_page
# ..work, commit..
git push -u origin feature/example_page
gh pr create --base develop --fill
```

Keep your branch current with `git pull --rebase origin develop` (or the **Update branch** button on the PR).

## Commit messages - Conventional Commits

```
<type>(<optional scope>): <short description>

<optional body>

<optional footer, e.g. Closes #12 or BREAKING CHANGE: ...>
```

| Type       | Use for                                        |
|------------|------------------------------------------------|
| `feat`     | A new feature                                  |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation only                             |
| `style`    | Formatting, no code change                     |
| `refactor` | Code change that isn't a fix or feature        |
| `perf`     | Performance improvement                        |
| `test`     | Adding or fixing tests                         |
| `build`    | Build system or dependencies                   |
| `ci`       | CI configuration                               |
| `chore`    | maintenance that doesn't fit elsewhere.        |
| `revert`   | Reverting a previous commit                    |

Add `!` for breaking changes: `feat(api)!: remove v1 endpoints`.

The **PR title** must follow the same format; feature PRs are squash-merged, so the title becomes the commit on `develop`.

## Pull requests

- **Into `develop`:** 1 approval, all checks green, conversations resolved. Squash-merged.
- **Into `master`:** same, plus approval from `maintainers`. Merge commit (keeps history).
- New pushes dismiss earlier approvals.
- Branches are deleted automatically after merge.

## Releasing

1. `git switch -c release/1.4.0 develop` - bump the version, final fixes only.
2. PR `release/1.4.0` -> `master`, titled `chore(release): 1.4.0`. Merge it.
3. Tag: `git tag v1.4.0 origin/master && git push origin v1.4.0`, then create a GitHub release.
4. PR `release/1.4.0` -> `develop` to bring back any fixes.

Simpler alternative: PR `develop` -> `master` directly when `develop` is ready.

## Hotfixes

1. `git switch -c hotfix/auth-error master`
2. PR into `master`, merge, tag a patch release.
3. PR the same branch into `develop`.

## CI checks on every PR

| Check            | What it enforces                                      |
|------------------|-------------------------------------------------------|
| Branch name      | Source branch is allowed to merge into the target     |
| Commit messages  | Every commit follows Conventional Commits             |
| PR title         | The PR title follows Conventional Commits             |
