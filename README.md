# Slayer Task Blocks

[![Deploy GitHub Pages](https://github.com/KihiraLove/slayer-blocks/actions/workflows/pages.yml/badge.svg)](https://github.com/KihiraLove/slayer-blocks/actions/workflows/pages.yml)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20me-29ABE0?logo=ko-fi&logoColor=white)](https://ko-fi.com/KihiraLove)

[Open Slayer Task Blocks](https://kihiralove.github.io/slayer-blocks/) to compare assignment odds and plan blocks for ten Slayer master tabs.

The task lists come from the supplied Slayer tasks workbook and the [Mortimer assignment table on the OSRS Wiki](https://oldschool.runescape.wiki/w/Mortimer#Tasks). On a first visit, every checkbox starts unchecked. Matching unlock requirements stay in sync across masters. With consent, a cookie saves the active tab, unlock requirements, preferred tasks, and blocks. Cookie settings in the footer lets you change your choice. Check an unlock requirement to make its task assignable. Stop the wyvern works in reverse and removes Fossil Island Wyverns from the pool without using a block slot. Checking Blocked removes a task from the pool and uses a slot. Preferred tasks contribute their remaining odds to the preferred-task total. Set the number of block slots above Assignments. The limit defaults to seven for configurable lists. Mortimer has two fixed slots and uses base assignment weights. Turael/Aya and Spria share one block list. Sourhogs appear with zero weight on Turael/Aya and use a shared slot when blocked. They only affect Spria's odds. Click an assignment column to sort it, then click again to reverse the order. Recommendations rank available, non-preferred tasks by base weight and mark blocks that are already selected.

## Run and test

```sh
git submodule update --init
node --test
python -m http.server 8000
```

The site uses [kihiras-tools-common](https://github.com/KihiraLove/kihiras-tools-common) for the shared shell. GitHub Actions publishes the static site to GitHub Pages.

Slayer master chat heads are local copies from the [OSRS Wiki](https://oldschool.runescape.wiki/w/Slayer_master), including the [Kuradal chat head](https://oldschool.runescape.wiki/w/File:Kuradal_chathead.png). Game artwork belongs to Jagex.