import {context, getOctokit} from '@actions/github';
import {GitHub} from '@actions/github/lib/utils';
import {GITHUB_TOKEN} from './config';
import {extractIssueNumbers} from './issue';
import {UnwrapOcktokitResponse} from './types';
import {getIssuesList, IssueType} from './youtrack';

const octokit: InstanceType<typeof GitHub> = getOctokit(GITHUB_TOKEN, {
  userAgent: 'youtrack-pr-action',
});

export type CommitType = UnwrapOcktokitResponse<typeof octokit.repos.listCommits>[number] & {
  issues: IssueType[];
};

export type PullType = UnwrapOcktokitResponse<typeof octokit.pulls.list>[number] & {
  issues: IssueType[];
  reviews: ReviewType[];
};

export type ChecksType = UnwrapOcktokitResponse<typeof octokit.checks.listForRef>;

export type ReviewType = UnwrapOcktokitResponse<typeof octokit.pulls.listReviews>[number];

export type PullRequestType = NonNullable<typeof context.payload.pull_request>;

export type RepositoryType = NonNullable<typeof context.payload.repository>;

export function getEventName(): string {
  return context.eventName;
}

export function getPullRequest(): PullRequestType {
  const pr = context.payload.pull_request;
  if (!pr) {
    throw new Error('Can not determine pull request in context.');
  }
  return pr;
}

export async function getCommit(ref: string): Promise<CommitType> {
  const githubCommit = await octokit.repos.getCommit({
    ...context.repo,
    ref,
  });

  const commits = addIssuesToCommits([githubCommit.data]);
  if (commits[0]) {
    return commits[0];
  }

  throw new Error(`Could not find ref "${ref}"`);
}

export async function getPullRequestIssues(pr: PullRequestType): Promise<IssueType[]> {
  const commits = await getPullRequestCommits(pr);
  const issues = new Map();
  commits.forEach((commit) => commit.issues.forEach((issue) => issues.set(issue.id, issue)));

  if (typeof pr.title === 'string') {
    const titleIssues = await getIssuesList(extractIssueNumbers(pr.title));
    titleIssues.forEach((issue) => issues.set(issue.id, issue));
  }

  return [...issues.values()];
}

type IssueIdsByCommitsType = {
  ids: string[];
  bySha: Map<string, string[]>;
};

export function getIssueIdsByCommits(
  commits: Array<{sha: string; commit: {message: string}}>,
): IssueIdsByCommitsType {
  const ids = new Set<string>();
  const bySha = new Map<string, string[]>();
  commits.map((commit) => {
    const list = extractIssueNumbers(commit.commit.message);
    list.map((id) => ids.add(id));
    bySha.set(commit.sha, list);
  });

  return {
    ids: [...ids],
    bySha,
  };
}

async function addIssuesToCommits(
  githubCommits: Array<UnwrapOcktokitResponse<typeof octokit.repos.listCommits>[number]>,
): Promise<CommitType[]> {
  const {ids: issueIds, bySha: issueIdsByCommitSha} = getIssueIdsByCommits(githubCommits);

  const issuesMap = (await getIssuesList(issueIds)).reduce((next, issue) => {
    next.set(issue.id, issue);
    return next;
  }, new Map<string, IssueType>());

  const commits: Array<CommitType> = githubCommits.map((commit) => {
    const issues = (issueIdsByCommitSha.get(commit.sha) || [])
      .map((id) => issuesMap.get(id))
      .filter(Boolean) as IssueType[];
    return {...commit, issues};
  });

  return commits;
}

export async function getPullRequestCommits(pr: PullRequestType): Promise<CommitType[]> {
  const githubCommits = await octokit.paginate(octokit.pulls.listCommits, {
    ...context.repo,
    pull_number: pr.number,
  });

  return addIssuesToCommits(githubCommits);
}

export async function getCommitsBetween(base: string, head: string): Promise<CommitType[]> {
  const githubCommits = await octokit.paginate(octokit.repos.compareCommits, {
    ...context.repo,
    base,
    head,
  });

  return addIssuesToCommits(githubCommits.commits);
}

export async function getReviews(pullNumber: number, commitId?: string): Promise<ReviewType[]> {
  const reviews = await octokit.paginate(octokit.pulls.listReviews, {
    ...context.repo,
    pull_number: pullNumber,
    commit_id: commitId,
  });

  return reviews;
}

export async function getChecks(ref: string): Promise<ChecksType> {
  const checks = await octokit.paginate(octokit.checks.listForRef, {
    ...context.repo,
    ref,
  });

  return checks;
}
