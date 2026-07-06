# Contributing to Precogly

Precogly welcomes contributions to the application, documentation, and library packs. Start by choosing the contribution path that matches the work you want to do, then use the relevant guide before opening a pull request.

Every contribution should be reviewed by a human before it is submitted. AI-assisted work is fine, but the contributor opening the pull request is responsible for understanding the change, testing it, and explaining the result clearly.

## Contribution Paths

| Path | Use this when | Start here |
| --- | --- | --- |
| **Code changes** | You are fixing bugs, improving UI flows, or changing backend behavior | [Development Setup](development-setup.md) |
| **Documentation changes** | You are fixing existing docs or adding new contributor/user guidance | [Development Setup](development-setup.md) |
| **Library packs** | You are adding or updating threat libraries, taxonomies, standards, or DFD templates | [Creating Library Packs](creating-library-packs.md) |

## Before You Open a Pull Request

Use this checklist before requesting review:

- Confirm the pull request title follows conventional commit format, such as `docs: update development setup`.
- Run the relevant local checks for the files you changed.
- Include screenshots or a short recording when a change affects the frontend UI.
- Explain the happy path you tested and at least one edge case.
- Read the final diff and make sure you can explain every meaningful change.

## Pull Request Titles

Precogly uses conventional commit-style pull request titles because they feed release notes and changelog automation.

| Prefix | Use for |
| --- | --- |
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation-only changes |
| `chore:` | Maintenance, CI, or dependency work |
| `refactor:` | Code changes that are neither fixes nor features |

Examples:

```text
docs: add Docker development setup
fix: prevent schema generation crash
feat: add OT/ICS threat library pack
```

## Contributor License Agreement

Before your first pull request can be merged, you will need to accept the project Contributor License Agreement. CLA Assistant prompts you automatically on your first pull request.

## Human Review Standard

Treat the pull request description as the reviewer's starting point. It should state what changed, why it changed, how it was tested, and any known limitations. For documentation-only work, include the local docs preview command you used and a screenshot of the rendered page when useful.
