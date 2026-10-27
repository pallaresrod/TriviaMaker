// The game in progress. Kept in localStorage so it survives a refresh or a closed tab.

import { STORAGE_KEYS } from '../constants.js';
import { isValidSession } from '../models/session.js';
import { readJson, removeKey, writeJson } from './storage.js';

export function getSession() {
  const session = readJson(STORAGE_KEYS.session, null);
  return isValidSession(session) ? session : null;
}

export function saveSession(session) {
  writeJson(STORAGE_KEYS.session, session);
}

export function clearSession() {
  removeKey(STORAGE_KEYS.session);
}
