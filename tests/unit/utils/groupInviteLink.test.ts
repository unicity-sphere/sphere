/**
 * Every invite link the app produced was dead.
 *
 * The builder emitted `…#/agents/group-chat?join=…` — the join value in the FRAGMENT —
 * while the reader used `searchParams.get('join')`. The router is a BrowserRouter, so
 * it never parses the fragment. The failure was silent: the recipient landed on the
 * group page with nothing prefilled and no error.
 *
 * The builder and the parser now live in one module, and the load-bearing test is that
 * they are inverse — not that each is independently plausible, which is exactly the
 * assumption that let them drift.
 */
import { describe, it, expect } from 'vitest';
import {
  buildGroupInviteLink,
  parseGroupInvite,
  readJoinParam,
} from '../../../src/utils/groupInviteLink';

const ORIGIN = 'https://sphere.unicity.network';
const GROUP = 'abc123groupid';
const CODE = 'InV1te-C0de';

describe('buildGroupInviteLink', () => {
  it('puts the join value in the QUERY, not the fragment', () => {
    const url = buildGroupInviteLink({ groupId: GROUP, code: CODE }, ORIGIN, '/');

    expect(url).not.toContain('#');
    expect(new URL(url).searchParams.get('join')).toBe(`${GROUP}/${CODE}`);
  });

  it('points at the route that actually reads the param', () => {
    const url = buildGroupInviteLink({ groupId: GROUP, code: CODE }, ORIGIN, '/');
    expect(new URL(url).pathname).toBe('/agents/group-chat');
  });

  it('uses the app base, not the current page path', () => {
    // The old builder used window.location.pathname, so a link copied while sitting on
    // /agents/dm pointed at /agents/dm. BASE_URL is what <BrowserRouter basename> gets.
    const url = buildGroupInviteLink({ groupId: GROUP, code: CODE }, ORIGIN, '/sphere/');
    expect(new URL(url).pathname).toBe('/sphere/agents/group-chat');
  });

  it('survives a code containing characters that would truncate a URL', () => {
    const nasty = 'a&b#c=d';
    const url = buildGroupInviteLink({ groupId: GROUP, code: nasty }, ORIGIN, '/');

    expect(readJoinParam(url)).toBe(`${GROUP}/${nasty}`);
  });
});

describe('parseGroupInvite', () => {
  it('splits on the FIRST slash, so a code may contain one', () => {
    expect(parseGroupInvite('grp/co/de')).toEqual({ groupId: 'grp', code: 'co/de' });
  });

  it('rejects values that carry no usable pair', () => {
    for (const bad of ['', '   ', 'nogroup', '/leading', 'trailing/']) {
      expect(parseGroupInvite(bad)).toBeNull();
    }
  });

  it('tolerates surrounding whitespace from a paste', () => {
    expect(parseGroupInvite(`  ${GROUP}/${CODE}  `)).toEqual({ groupId: GROUP, code: CODE });
  });
});

describe('build and parse are inverse', () => {
  it('round-trips every shape a real invite takes', () => {
    for (const invite of [
      { groupId: GROUP, code: CODE },
      { groupId: GROUP, code: 'code/with/slashes' },
      { groupId: GROUP, code: 'a&b#c=d' },
      { groupId: 'g', code: 'c' },
    ]) {
      const url = buildGroupInviteLink(invite, ORIGIN, '/');
      const value = readJoinParam(url);
      expect(value).not.toBeNull();
      expect(parseGroupInvite(value!)).toEqual(invite);
    }
  });
});

/**
 * The copy button puts a full URL on the clipboard, and the manual field is
 * labelled "invite link" — so pasting that URL there is the obvious move. It
 * used to fail: the parser split on the first slash and read "https:" as the
 * group id, rejecting a link the app itself had just produced.
 */
describe('parseGroupInvite — pasted invite URL', () => {
  it('accepts the exact URL the copy button produces', () => {
    const url = buildGroupInviteLink({ groupId: GROUP, code: CODE }, ORIGIN, '/');
    expect(parseGroupInvite(url)).toEqual({ groupId: GROUP, code: CODE });
  });

  it('accepts a URL served from a sub-path deployment', () => {
    const url = buildGroupInviteLink({ groupId: GROUP, code: CODE }, ORIGIN, '/preview/pr-1/');
    expect(parseGroupInvite(url)).toEqual({ groupId: GROUP, code: CODE });
  });

  it('keeps codes with URL-significant characters intact through a paste', () => {
    const invite = { groupId: GROUP, code: 'a&b#c=d/e' };
    const url = buildGroupInviteLink(invite, ORIGIN, '/');
    expect(parseGroupInvite(url)).toEqual(invite);
  });

  it('still accepts the bare groupId/code form', () => {
    expect(parseGroupInvite(`${GROUP}/${CODE}`)).toEqual({ groupId: GROUP, code: CODE });
  });

  it('rejects a URL that carries no invite rather than parsing its path', () => {
    // Splitting "https://host/agents/group-chat" on the first slash yields
    // "https:" as a group id — a confident, wrong answer.
    expect(parseGroupInvite(`${ORIGIN}/agents/group-chat`)).toBeNull();
    expect(parseGroupInvite(`${ORIGIN}/`)).toBeNull();
  });

  it('rejects a URL whose join value is itself malformed', () => {
    expect(parseGroupInvite(`${ORIGIN}/agents/group-chat?join=nogroup`)).toBeNull();
  });

  it('tolerates whitespace around a pasted URL', () => {
    const url = buildGroupInviteLink({ groupId: GROUP, code: CODE }, ORIGIN, '/');
    expect(parseGroupInvite(`  ${url}  `)).toEqual({ groupId: GROUP, code: CODE });
  });
});
