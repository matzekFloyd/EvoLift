# Versioning

EvoLift has one product version: `MAJOR.MINOR.PATCH`.

The site footer shows it, with a `v` prefix (`EvoLift v1.0.0`). An Android release uses the same number as its version name. Play also needs an integer version code, and that code is calculated from the product version.

The previous footer text `v6.0` was not part of a scheme. `1.0.0` is the first version under this convention, and the first build for Play internal testing.

## Where to change it

Edit `evo-lift/app-version.json` only:

```json
{ "version": "1.0.0" }
```

Do not put a `v` in that file. Do not set an Android version code by hand.

The `"version"` fields in `package.json` are npm metadata. They are not the product version. The OpenAPI document version is separate too.

## When to bump

Bump the product version in the same change as the product change.

| Part | When |
| --- | --- |
| Major | A lifter has to relearn an existing way of logging, planning, or managing an account. |
| Minor | A lifter gets a new capability, such as a new screen or a new way to log or plan. |
| Patch | A fix, a wording change, or a shell-only Play upload that does not add a capability. |

Do not skip numbers. Minor and patch each stay in `0`–`999`. A two-part label such as `7.0` is not a product version.

## Play version code

Every Play upload must use a higher version code than the build already on the track. EvoLift calculates it:

```text
versionCode = MAJOR * 1000000 + MINOR * 1000 + PATCH
```

| Product version | Play version code |
| --- | --- |
| 1.0.0 | 1000000 |
| 1.0.1 | 1000001 |
| 1.1.0 | 1001000 |
| 1.2.3 | 1002003 |
| 2.0.0 | 2000000 |

`0.0.0` is not valid. The code must be from 1 through 2100000000, which is Play's limit.

Do not upload the same product version twice. Bump the patch first, then build the bundle. A site deploy can move ahead of the last Play upload: the shell loads the live site, so the footer shows the deployed site version, while Play shows the version of the uploaded shell.

## GitHub Releases

When `evo-lift/app-version.json` changes on `master`, GitHub Actions creates a [GitHub Release](https://github.com/matzekFloyd/EvoLift/releases) tagged `vMAJOR.MINOR.PATCH` (same label as the site footer). The workflow generates notes from commits since the previous release. It does not upload a Play `.aab`; that stays a local `npm run android:bundle` step.

Older tags such as `v5.0` are from before this scheme. Do not create those two-part tags again.
