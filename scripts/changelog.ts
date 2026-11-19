#!/usr/bin/env -S deno --allow-read --allow-write=public/docs --allow-run=git

import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";
import luxon from "./luxon.ts";
import {run} from "./util.ts";

const {DateTime} = luxon;

const API_CONTROLLER_PATH = "./app/Http/Controllers/ApiController.php";
const MD_FILE = "ch.part.md";
const GITHUB_REPO = "mblajek/Memo";

type MinorVersion = readonly [major: number, minor: number];

function parseMinorVersion(v: string): MinorVersion | undefined {
  const match = v.match(/^(?<major>\d+)\.(?<minor>\d+)$/);
  return match ? [Number(match.groups!.major), Number(match.groups!.minor)] : undefined;
}

function compareMinorVersions([aMajor, aMinor]: MinorVersion, [bMajor, bMinor]: MinorVersion) {
  return aMajor - bMajor || aMinor - bMinor;
}

const apiControllerCode = await Deno.readTextFile(API_CONTROLLER_PATH);
const versionMatch = apiControllerCode.match(
  /^\s+final public const string VERSION = '(?<major>\d+)\.(?<minor>\d+)\.\d+';$/m,
)?.groups;
if (!versionMatch?.major || !versionMatch.minor) {
  throw new Error(`Cannot find version info in ${API_CONTROLLER_PATH}`);
}
const currentVersion: MinorVersion = [Number(versionMatch.major), Number(versionMatch.minor)];
const version = currentVersion.join(".");
console.log(`Current version: ${version}`);

const RELEASE_BRANCH_PREFIX = "origin/release/";
const releaseBranches = (
  await run(["git", "for-each-ref", "--format=%(refname:short)", `refs/remotes/${RELEASE_BRANCH_PREFIX}`])
)
  .split("\n")
  .flatMap((branch) => {
    const v = parseMinorVersion(branch.slice(RELEASE_BRANCH_PREFIX.length));
    return v ? [{branch, v}] : [];
  });
const previousReleaseBranch =
  releaseBranches
    .filter(({v}) => compareMinorVersions(v, currentVersion) < 0)
    .sort((a, b) => compareMinorVersions(a.v, b.v))
    .at(-1)?.branch ??
  // The last release before the release/x.y branches.
  "origin/master";
console.log(`Previous release branch: ${previousReleaseBranch}`);

const gitLog = Array.from(
  (
    await run(["git", "log", `${previousReleaseBranch}..HEAD`, "--reverse", "--no-merges", "--format=%H %at %an%n%s%n"])
  ).matchAll(/^(?<hash>[0-9a-f]{40}) (?<timestamp>\d+) (?<author>.+?)\n(?<title>.+?)\n\n/gm),
  ({groups}) => {
    const {hash, timestamp, author, title} = groups as Record<"hash" | "timestamp" | "author" | "title", string>;
    return {hash, date: DateTime.fromSeconds(Number(timestamp)), author, title};
  },
);
if (!gitLog.length) {
  console.log("No entries in git log");
  Deno.exit();
}
const finalise = confirm(`Finalise the changelog?`);

for await (const entry of await fs.expandGlob(`./public/docs/*/changelog/template/${MD_FILE}`)) {
  if (!entry.isFile) {
    continue;
  }
  const templateDir = path.dirname(entry.path);
  const lang = path.basename(path.resolve(templateDir, "../.."));
  const targetDir = path.join(path.dirname(templateDir), `v${version}`);
  const mdFile = path.join(targetDir, MD_FILE);
  if (!(await fs.exists(mdFile))) {
    console.log(`Copying directory ${templateDir} to ${targetDir}`);
    await fs.copy(templateDir, targetDir, {overwrite: true});
  }
  console.log(`Processing ${mdFile}`);
  let mdContent = await Deno.readTextFile(mdFile);
  mdContent = mdContent
    .replaceAll("$$$VERSION$$$", version)
    .replace(
      /^(?<pre>.+?\$\$\$ADD_LOG_ABOVE_SINCE_COMMIT\$\$\$ )(?<sinceHash>\w+)(?<post>.+?)$/m,
      (marker, pre, sinceHash, post) => {
        const appendLog = gitLog.slice(gitLog.findIndex((entry) => entry.hash === sinceHash) + 1);
        if (!appendLog.length) {
          return marker;
        }
        return `${appendLog
          .map(
            ({hash, date, author, title}) =>
              `\`⚪\` ${title} \\\n${date.toFormat("yyyy-MM-dd HH:mm:ss")} ${author} ` +
              `([${hash.slice(0, 8)}](https://github.com/${GITHUB_REPO}/commits/${hash}))`,
          )
          .join("\n\n")}\n\n${pre}${appendLog.at(-1)!.hash}${post}`;
      },
    );
  if (finalise) {
    mdContent = mdContent
      .replaceAll("$$$DATE$$$", DateTime.now().plus({hours: 10}).toLocaleString({dateStyle: "long"}, {locale: lang}))
      .replace(/\n+.+?\$\$\$DELETE_FROM_HERE_WHEN_FINAL\$\$\$[\s\S]+$/, "\n");
  }
  await Deno.writeTextFile(mdFile, mdContent);
  const inclusion = `$include(changelog/v${version}/ch.part.md`;
  const changelogMdFile = path.resolve(templateDir, "../../changelog.md");
  const changeLogMdContent = await Deno.readTextFile(changelogMdFile);
  if (!changeLogMdContent.includes(inclusion)) {
    console.log(`Referencing ${mdFile} in ${changelogMdFile}`);
    await Deno.writeTextFile(
      changelogMdFile,
      changeLogMdContent.replace(/^.+?\$\$\$ADD_LATEST_BELOW\$\$\$.+?$/m, (marker) => `${marker}\n\n${inclusion})`),
    );
  }
}
console.log("Done");
