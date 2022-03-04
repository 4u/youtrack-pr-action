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

export async function getPullRequestCommits(pr: PullRequestType): Promise<CommitType[]> {
  const githubCommits = await octokit.paginate(octokit.pulls.listCommits, {
    ...context.repo,
    pull_number: pr.number,
  });

  const issueIds = new Set<string>();
  const issueIdsByCommitSha = new Map<string, string[]>();
  githubCommits.map((commit) => {
    const list = extractIssueNumbers(commit.commit.message);
    list.map((id) => issueIds.add(id));
    issueIdsByCommitSha.set(commit.sha, list);
  });

  const issuesMap = (await getIssuesList([...issueIds])).reduce((next, issue) => {
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
