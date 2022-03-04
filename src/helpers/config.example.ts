import {getInput} from '@actions/core';

// https://joom.myjetbrains.com/youtrack/admin/hub/users/me?tab=authentification
export const YOUTRACK_TOKEN = getInput('youtrack_token');
export const YOUTRACK_BASE_URL = getInput('youtrack_base_url');
export const GITHUB_TOKEN = getInput('github_token');
