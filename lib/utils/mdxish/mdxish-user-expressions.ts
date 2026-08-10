import type { Variables } from '../../../types';

import React from 'react';

import User from '../../../utils/user';

import { evalExpression } from './mdxish-expression';
import { referencesUserBinding } from './mdxish-variables';

/** A prop value that is exactly one expression, i.e. the `{source}` a failed parse-time eval left. */
const WHOLE_EXPRESSION_REGEX = /^\{([\s\S]+)\}$/;

export interface UserExpressionScope {
  /** In-document `export const` bindings, so an expression can mix them with `user`. */
  mdxishScope: object;
  user: unknown;
}

export function createUserExpressionScope(variables?: Variables, mdxishScope: object = {}): UserExpressionScope {
  return { mdxishScope, user: User(variables) };
}

/**
 * Evaluate an attribute expression that reads `user`, e.g. ``title={`Hi ${user.name}`}``.
 *
 * The parse stage can't: on the MDX cache path it runs server-side, where the reader is unknown and
 * a `User()` proxy would bake placeholder values into a tree shared by every reader. It leaves the
 * literal `{source}` in the prop instead, and this re-reads it per render — so the same tree
 * resolves correctly for whichever reader it's rendered for, however many times.
 *
 * Returns `undefined` when the value isn't a resolvable user expression, leaving the caller's
 * simpler `{user.*}` substitution to handle it. Expressions that never mention `user` are skipped
 * rather than retried, so a parse-time failure is never newly executed in the reader's browser.
 */
export function evaluateUserExpression(value: string, scope: UserExpressionScope): unknown {
  const source = value.match(WHOLE_EXPRESSION_REGEX)?.[1];
  if (!source || !referencesUserBinding(source)) return undefined;

  try {
    return evalExpression(source, { ...scope.mdxishScope, React, user: scope.user });
  } catch {
    return undefined;
  }
}
