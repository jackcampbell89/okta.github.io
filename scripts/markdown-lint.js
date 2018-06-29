/**
 * Parse through all markdown files searching for known
 * substrings and invalid characters. This helps maintain
 * a common schema for naming conventions, and discover bad
 * characters.
 */
const path = require('path');
const fs = require('fs');
const readdir = require('recursive-readdir');
const chalk = require('chalk');

/** Look for:
 *  - https://your-org.okta.com
 *  - https://example.okta.com
 *  - https://rain.okta.com
 *  - https://your-subdomain.okta.com
 *  - https://your-domain.okta.com
 *  - https://{org}.okta.com
 *  - https://{yourOktaDomain}.com
*/
const regexValidator = [
  'https?:\/\/(your-org|example|rain|your-subdomain|your-domain|{org}).okta*',
  'https?:\/\/{yourOktaDomain}.com*',
  'index#',
  '(“|”)',
  '(‘|’)',
  '…'
]

function header(str) {
  console.log(`\n${chalk.bold(str)}`);
}

function error(str) {
  console.log(chalk.bold.red(str));
}

async function getFiles(dir) {
  const files = await readdir(dir);
  const filesToCheck = [];
  const fileMap = {};

  for (let file of files) {
    const relative = file.replace(dir, '');
    fileMap[relative] = true;
    if (!file.includes('/_docs/api/postman/')
      && !file.includes('_sdk/')
      && !file.includes('/_assets')
      && !file.includes('/.asset-cache')
      ) {
      filesToCheck.push({ orig: file, relative });
    }
  }

  return { filesToCheck, fileMap };
}

function findWithRegex(file, regex) {
  const contents = fs.readFileSync(file.orig, 'utf8');
  return (contents.match(new RegExp(regex, 'g')) || [])
    .map(res => {
      const match = res.match(new RegExp(regex));
      return {regex: match[0], name: match[1]};
    });
}

async function run(dir) {
  const files = await getFiles(path.resolve(dir));
  const badFiles = [];
  header(`Checking source and dist for invalid substrings and characters (${__filename})`);
  header(`Found ${files.filesToCheck.length} files to check in ${dir}`);

  for (let file of files.filesToCheck) {
    var findings = [];
    await regexValidator.forEach(regex => {
      findings = findings.concat(findWithRegex(file, regex))
    });

    if (findings.length > 0) {
      console.log(`  Error in ${file.relative}`);
      findings.forEach(match => console.log(`    └─ Invalid String: ${match.name} using regex: [${match.regex}]`));
      badFiles.push({ file, findings });
    }
  }

  if (badFiles.length > 0) {
    let nameCount = 0;
    error('\nProblems found!\n');
    for (let i = 0; i < badFiles.length; i++) {
      const badFile = badFiles[i];
      nameCount += badFile.findings.length;
      error(`${i+1}. ${badFile.file.relative}`);
      badFile.findings.forEach(match => error(`    └─ Invalid String: ${match.name} using regex: [${match.regex}]`));
    }
    error(`
Found ${badFiles.length} files with ${nameCount} invalid substrings and/or characters.

To Fix:
1. Find the source .md files
2. Search in the source file for the problem links
3. Change the invalid substrings and/or charaters based on the regex error:
  - [http://your-org.okta]
      - use either 'https://{yourOktaDomain}' or 'https://{yourOktaDomain}/oauth2/default'
  - [https://example.okta]
      - use either 'https://{yourOktaDomain}' or 'https://{yourOktaDomain}/oauth2/default'
  - [http://{org}.okta]
      - use either 'https://{yourOktaDomain}' or 'https://{yourOktaDomain}/oauth2/default'
  - [https://{yourOktaDomain}.com]
      - use either 'https://{yourOktaDomain}' or 'https://{yourOktaDomain}/oauth2/default'
  - [index#]
      - Found a link containing "index" without a filetype!
  - [(“|”)]
      - Malformed character! Replace with (")
  - [(‘|’)]
      - malformed character! Replace with (')
  - […]
      - Malformed ellipsis character! Replace with (...)
    `);
    process.exit(1);
  } else {
    console.log(chalk.bold.green('\nNo problems found!\n'));
  }
}

// Run ------------------------------------------------------------------------

module.exports = run;
