import {debug, warning} from '@actions/core';
import {Command, Issue, Youtrack} from 'youtrack-rest-client';
import {YOUTRACK_BASE_URL, YOUTRACK_TOKEN} from './config';
import {IssueCustomFieldValue} from 'youtrack-rest-client/dist/entities/issueCustomField';

const youtrack = new Youtrack({
  baseUrl: YOUTRACK_BASE_URL,
  token: YOUTRACK_TOKEN,
});

export type IssueType = Issue & {
  id: string;
};

export async function getIssuesList(list: string[]): Promise<IssueType[]> {
  const result = await Promise.all(list.map((id) => getIssueById(id)));
  return result.filter(Boolean) as IssueType[];
}

export const getIssueById = (id: string) =>
  youtrack.issues
    .byId(id)
    .then((value) => ({
      ...value,
      id,
    }))
    .catch((err) => {
      warning(`Can not get data for ${id} issue.`);
      debug(err);
    });

export const getCommandIssues = (issues: (IssueType | string)[]): Command['issues'] => {
  const list = issues.map((issue) => ({
    idReadable: typeof issue === 'string' ? issue : issue.id,
  }));
  // api supports idReadable, but there are bad typeings for youtrack pacakges
  return list as unknown as Array<{id: string}>;
};

export const applyCommand = (command: Command) =>
  youtrack.issues
    .executeCommand(command)
    .catch((err) => console.error(`Can not apply command`, command, err));

export function getIssueFieldValue(issue: Issue, name: string): IssueCustomFieldValue | undefined {
  return issue.fields?.find((field) => field.name === name)?.value || undefined;
}

export function getIssueState(issue: Issue): string | undefined {
  return getIssueFieldValue(issue, 'State')?.name;
}

export function getIssueUrl(id: string): string {
  return `${YOUTRACK_BASE_URL}/issue/${id}`;
}
