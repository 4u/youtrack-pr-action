import {context} from '@actions/github';
import {setFailed, getInput} from '@actions/core';
import {getPullRequestCommits} from './helpers/github';
import {applyCommand, getCommandIssues} from './helpers/youtrack';

async function getCommitsList() {
  const pr = context.payload.pull_request;
  if (pr) {
    return getPullRequestCommits(pr);
  }
  throw new Error('Does not support non-pr events.');
}

export const run = async () => {
  const command = getInput('youtrack_command');

  process.env.GITHUB_REPOSITORY = 'joomcode/joom-web-client';
  const commits = await getCommitsList();
  const issues = new Map();
  commits.forEach((commit) => commit.issues.forEach((issue) => issues.set(issue.id, issue)));

  await applyCommand({
    query: command,
    issues: getCommandIssues([...issues.values()]),
  });
};

export const wait = (milliseconds: number) => {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), milliseconds));
};

run().catch((error) => {
  console.error('ERROR', error);
  setFailed(error.message);
});
