/* eslint-disable no-console */

// Prints the git version info, in the format:
//
// <commit hash>
// <commit date>
// <modified files>

import { execSync } from 'child_process';

console.log(execSync('git log -1 --format="%H%n%ci"').toString().trimEnd());
console.log(execSync('git status --porcelain').toString().trimEnd());
