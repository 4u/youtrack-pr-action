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
  const command = getInput('command');
  const guard = getInput('if');
  if (!command) {
    throw new Error('`command` is not specified.');
  }

  const readableIds = await getIssueIds();
  if (!readableIds.length) {
    console.log(`Can not find YouTrack IDs`);
    return;
  }

  const issues = await searchIssues(readableIds, guard);
  if (!issues.length) {
    console.log(`Can not find any issues by given IDs: ${readableIds.length}.`);
    console.log(`Usually it happens when YouTrack issue number misstyped or guard is too strong.`);
    console.log(`Applied guard: ${guard}`);
    return;
  }

  console.log(`Extracted issue IDs on GitHub: ${readableIds.join(', ')}`);
  console.log(`Found issues on YouTrack: ${issues.map((issue) => issue.idReadable).join(', ')}`);
  console.log(`Query: ${command}`);

  await applyCommand({
    query: command,
    issues: getCommandIssues(issues),
  });
};

run().catch((error) => {
  console.error('ERROR', error);
  setFailed(error.message);
});
