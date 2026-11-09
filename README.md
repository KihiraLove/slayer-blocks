# Slayer Task Blocks

[![Deploy GitHub Pages](https://github.com/KihiraLove/slayer-blocks/actions/workflows/pages.yml/badge.svg)](https://github.com/KihiraLove/slayer-blocks/actions/workflows/pages.yml)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20me-29ABE0?logo=ko-fi&logoColor=white)](https://ko-fi.com/KihiraLove)

[Open Slayer Task Blocks](https://kihiralove.github.io/slayer-blocks/) to compare assignment odds and plan blocks for nine Slayer master tabs.

The task lists, amounts, weights, and unlock names come from the supplied Slayer tasks workbook. Every checkbox starts unchecked. Checking an unmet unlock requirement or a block removes that task's weight from the pool. Preferred tasks contribute their remaining odds to the preferred-task total. Recommendations rank available, non-preferred tasks by base weight and mark blocks that are already selected.

## Run and test

```sh
git submodule update --init
node --test
python -m http.server 8000
```

The site uses [kihiras-tools-common](https://github.com/KihiraLove/kihiras-tools-common) for the shared shell. GitHub Actions publishes the static site to GitHub Pages.

Slayer master chat heads are local copies from the [OSRS Wiki](https://oldschool.runescape.wiki/w/Slayer_master), including the [Kuradal chat head](https://oldschool.runescape.wiki/w/File:Kuradal_chathead.png). Game artwork belongs to Jagex.