import {context} from '@actions/github';
import {setFailed, getInput} from '@actions/core';
import {
  getCommit,
  getCommitsBetween,
  getIssueIdsByCommits,
  getPullRequestIssueIds,
} from './helpers/github';
import {applyCommand, getCommandIssues, searchIssues} from './helpers/youtrack';

const getIssueIds = async () => {
  const base = getInput('base');
  const head = getInput('head');
  if (base && head) {
    const commits = await getCommitsBetween(base, head);
    const {ids} = getIssueIdsByCommits(commits);
    return [...ids];
  }

  const pr = context.payload.pull_request;
  if (pr) {
    return getPullRequestIssueIds(pr);
  }

  const commit = await getCommit(context.sha);
  const {ids} = getIssueIdsByCommits([commit]);
  return [...ids];
};

export const run = async () => {
  const command = getInput('youtrack_command');
  const guard = getInput('youtrack_guard');
  if (!command) {
    throw new Error('`youtrack_command` is not specified.');
  }

  const readableIds = await getIssueIds();
  const issues = await searchIssues(readableIds, guard);

  await applyCommand({
    query: command,
    issues: getCommandIssues(issues),
  });
};

run().catch((error) => {
  console.error('ERROR', error);
  setFailed(error.message);
});
