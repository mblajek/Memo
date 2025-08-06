import {isDEV} from "components/utils/dev_mode";
import {currentLanguage, TESTING_LANGUAGE} from "i18n_loader";

const ABSOLUTE_PATH_PATTERN = /^(\/|https?:)/;

export function resolvePath(currentPath: string, path: string) {
  if (path.match(ABSOLUTE_PATH_PATTERN)) {
    return path;
  }
  return [...currentPath.split("/").slice(0, -1), path].join("/");
}

const APP_HELP_PATH_PATTERN = /^\/help\/(.+)$/;

export function resolveMdFromAppPath(appHelpPath: string) {
  const match = appHelpPath.match(APP_HELP_PATH_PATTERN);
  if (!match) {
    throw new Error(`Unexpected help path: ${appHelpPath}`);
  }
  return {
    helpPagePath: match[1],
    mdPath:
      currentLanguage() === TESTING_LANGUAGE
        ? `/docs/dev/testing-language-docs.md`
        : currentLanguage()
          ? `/${isDEV() ? "docs" : "docs-remote"}/${currentLanguage()}/${match[1]}.md`
          : undefined,
  };
}
