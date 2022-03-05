import {getInput} from '@actions/core';
import {Command, Issue, ReducedIssue, Youtrack} from 'youtrack-rest-client';

const youtrack = new Youtrack({
  baseUrl: getInput('youtrack_base_url'),
  token: getInput('youtrack_token'),
});

export type IssueType = ReducedIssue & {idReadable: string};

function idReadable(issue: ReducedIssue | Issue | IssueType): string {
  if ('idReadable' in issue) {
    return issue.idReadable;
  }
  if (issue.project?.shortName && issue.numberInProject) {
    return `${issue.project.shortName}-${issue.numberInProject}`;
  }
  return '';
}

export async function searchIssues(readableIds: string[], guard?: string): Promise<IssueType[]> {
  const issuesQuery = `issue ID: ${readableIds.join(' or ')}`;
  const query = guard ? `(${issuesQuery}) and (${guard})` : issuesQuery;
  return youtrack.issues
    .search(query, {
      $top: 50,
    })
    .then((issues) =>
      issues
        .map((issue) => ({
          ...issue,
          idReadable: idReadable(issue),
        }))
        .filter((issue) => issue.idReadable),
    );
}

export const getCommandIssues = (issues: IssueType[]): Command['issues'] => {
  const list = issues.map((issue) => ({idReadable: issue.idReadable}));
  return list as unknown as Array<{id: string}>;
};

export const applyCommand = (command: Command) =>
  youtrack.issues
    .executeCommand(command)
    .catch((err) => console.error(`Can not apply command`, command, err));
