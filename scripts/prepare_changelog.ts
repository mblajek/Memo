import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";

const API_CONTROLLER_PATH = "./app/Http/Controllers/ApiController.php";
const MD_FILE = "ch.part.md";

const apiControllerCode = await Deno.readTextFile(API_CONTROLLER_PATH);
const match = apiControllerCode.match(/^\s+final public const string VERSION = '(\d+\.\d+)\.\d+';$/m);
if (!match) {
  throw new Error(`Cannot find version info in ${API_CONTROLLER_PATH}`);
}
const version = match[1];
console.log(`New version: ${version}`);

const gitLogRes = await new Deno.Command("git", {
  args: [
    "log",
    "origin/master..HEAD",
    "--no-merges",
    "--reverse",
    "--oneline",
    "--format=🟢%s \\%n%ad %an (%h)%n",
    "--date",
    "local",
  ],
}).output();
if (!gitLogRes.success) {
  throw new Error(`git log failure:\n${new TextDecoder().decode(gitLogRes.stderr)}`);
}
const gitLog = new TextDecoder().decode(gitLogRes.stdout);

for await (const entry of await fs.expandGlob(`./public/docs/*/changelog/template/${MD_FILE}`)) {
  if (!entry.isFile) {
    continue;
  }
  const templateDir = path.dirname(entry.path);
  console.log(`Copying directory ${templateDir}`);
  const lang = path.basename(path.resolve(templateDir, "../.."));
  const targetDir = path.join(path.dirname(templateDir), `v${version}`);
  await fs.copy(templateDir, targetDir);
  const mdFile = path.join(targetDir, MD_FILE);
  const mdContent = await Deno.readTextFile(mdFile);
  await Deno.writeTextFile(
    mdFile,
    mdContent
      .replaceAll("$VERSION$", version)
      .replaceAll("$DATE$", new Date().toLocaleDateString(lang, {dateStyle: "long"}))
      .replaceAll("$LOG$", gitLog),
  );
  const changelogMdFile = path.resolve(templateDir, "../../changelog.md");
  const changeLogMdContent = await Deno.readTextFile(changelogMdFile);
  await Deno.writeTextFile(
    changelogMdFile,
    changeLogMdContent.replaceAll(
      /^.+?\$ADD_LATEST_BELOW\$.+?$/gm,
      (marker) => `${marker}\n\n$include(changelog/v${version}/ch.part.md)`,
    ),
  );
}
console.log("Done");
