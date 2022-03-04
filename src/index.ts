import {context} from '@actions/github';
import {setFailed, getInput} from '@actions/core';
import {getCommit, getCommitsBetween, getPullRequestIssues} from './helpers/github';
import {applyCommand, getCommandIssues} from './helpers/youtrack';

const getIssues = async () => {
  const base = getInput('base');
  const head = getInput('head');
  if (base && head) {
    const commits = await getCommitsBetween(base, head);
    const issues = new Map();
    commits.forEach((commit) => commit.issues.forEach((issue) => issues.set(issue.id, issue)));
    return [...issues.values()];
  }

  const pr = context.payload.pull_request;
  if (pr) {
    return getPullRequestIssues(pr);
  }

  const commit = await getCommit(context.sha);
  return commit.issues;
};

export const run = async () => {
  const command = getInput('youtrack_command');
  if (!command) {
    throw new Error('`youtrack_command` is not specified.');
  }

  const issues = await getIssues();

  await applyCommand({
    query: command,
    issues: getCommandIssues(issues),
  });
};

run().catch((error) => {
  console.error('ERROR', error);
  setFailed(error.message);
});
