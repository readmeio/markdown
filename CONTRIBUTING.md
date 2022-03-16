Contributing
===

<img align="right" width="25%" style="margin-bottom: 2em" src="https://owlbert.io/images/owlberts-png/Waiter.psd.png">

### Commit Conventions

When pushing or merging PRs in to main, your commit messages should follow the [Angular commit conventions](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines). At it's simplest, this looks something like `{type}: change this, add that`, where the commit `{type}` can be one of the following:

| Commit Type | Description |
| :--- | :--- |
| `build` | creating a new release |
| `chore` | assorted minor changes |
| `ci` | updates related to the ci process |
| `docs` | documentation updates |
| `feat` | new elements; major features and updates |
| `fix` | bug fixes; security updates |
| `perf` | performance improvements |
| `refactor` | general refactors |
| `revert` | reverting a previous commit |
| `style` | aesthetic changes |
| `test` | adding or updating existing tests |

You can also optionally note the `{scope}` of your changes in an additional parenthetical. If your changes require a longer description, feel free to add a commit message with further details! Combining all of these together, you might end up with something like:

```text
feat(api-explorer): add color variants

- some more details
- about the changes
```

### Visual Regression Tests

If you update the docs or the rendering changes, you'll need to update the snapshots. As most environments font configs are different, the simplest thing to do is grab the updated snapshots from the **Artifacts** section of your GitHub Actions workflow run (see [this failed workflow run](https://github.com/readmeio/markdown/actions/runs/1994189147) for an example).

After a failed test, the updated snapshots should be available for download in the `image-snapshots` artifact. To update the snapshots, unzip the `image-snapshots` file and load its images into the `__tests__/browser/ci` directory. You can also view the (somewhat chaotic) image diffs in the `image-diffs` artifact.
