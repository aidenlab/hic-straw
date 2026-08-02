# ADR-0001 — Transport extension points on RemoteFile

**Status:** Accepted
**Date:** 2026-08-01
**Amended:** 2026-08-02 — see *Amendment* at the end. `mapUrl` composes with the
default rules rather than replacing them, and is scoped to development. Read the
amendment before the decision below.

## Context

`RemoteFile` (`src/io/remoteFile.js`) is the single place hic-straw reads bytes
from a remote `.hic` file. It calls the global `fetch` directly, and it has two
properties that consumers cannot work around from the outside:

1. **The URL is fixed at construction.** `mapUrl()` rewrites Dropbox and NCBI FTP
   URLs, but the rule set is hardcoded. A consumer that needs a different
   rewrite — for instance routing a request through a local proxy — has no way to
   supply one.
2. **The response is discarded on error.** A failed read throws
   `Error(response.statusText)` carrying only `err.code`. Every response header
   dies inside hic-straw.

Property 2 has a concrete cost. AWS WAF, which fronts `www.encodeproject.org`,
answers non-allowlisted origins with a CAPTCHA challenge page and a `405` status.
The only reliable signal that this happened is the `X-Amzn-Waf-Action: captcha`
response header. Because hic-straw drops it, every consumer sees a bare
`405 Method Not Allowed` and no consumer can explain the real failure to a user.

Both properties push consumers toward patching `globalThis.fetch`, which is
action at a distance, pollutes the host application, and affects transports that
have nothing to do with hic-straw.

## Decision

Add two extension points to `RemoteFile`, both optional, both carried on the
existing config object that already flows `new Straw(config)` → `HicFile` args →
`new RemoteFile(args)`.

**1. `config.mapUrl` — a URL mapping function.**

```js
this.url = (this.config.mapUrl ?? defaultMapUrl)(args.path || args.url)
```

The existing hardcoded Dropbox and NCBI rules become `defaultMapUrl`. Supplying
`mapUrl` replaces them; omitting it changes nothing.

**2. Response detail on the thrown error.**

```js
const err = Error(response.statusText)
err.code = status
err.headers = response.headers
err.url = url
throw err
```

Both are **generic**. hic-straw learns nothing about WAFs, CAPTCHAs, proxies,
localhost, or any particular data provider. It gains the ability to be told where
to fetch from, and the obligation to report what it was told when a fetch fails.
Interpretation belongs to the consumer.

## Consequences

- juicebox.js can route ENCODE requests through a dev-time proxy without patching
  globals, and can turn `X-Amzn-Waf-Action: captcha` into a message a user can
  act on. See juicebox.js `docs/adr/0001-dev-proxy-for-waf-protected-hosts.md`,
  which depends on this decision.
- Spacewalk, which depends on hic-straw directly as well as through juicebox.js,
  gets the same two capabilities without a juicebox.js release.
- `err.headers` is a `Headers` instance, not a plain object. Consumers read it
  with `err.headers?.get(name)` and must tolerate its absence — errors thrown
  before a response exists (network failure, abort) have no headers.
- `mapUrl` is a synchronous pure function of a URL string. It is deliberately not
  a fetch hook: it cannot set headers, inspect responses, or alter Range
  semantics. A consumer needing that should be a reason to reopen this ADR, not
  a reason to widen `mapUrl` quietly.
- Replacing `defaultMapUrl` rather than composing with it means a consumer who
  supplies `mapUrl` also inherits responsibility for the Dropbox and NCBI
  rewrites if their URLs need them. This is the simpler contract; composition can
  be added later without breaking callers.

## Amendment — 2026-08-02

Three things changed before implementation. Nothing had been built on the
original, so this ADR is amended in place rather than superseded.

**1. `mapUrl` composes; it does not replace.**

```js
const mapped = defaultMapUrl(args.path || args.url)
this.url = this.config.mapUrl ? this.config.mapUrl(mapped) : mapped
```

The original wording made a consumer who supplies `mapUrl` silently inherit
responsibility for the Dropbox and NCBI rewrites. A consumer adding one proxy
route would have switched off two rules it had never heard of, and the resulting
bug — a pasted Dropbox link fetching an HTML preview page and failing the header
parse — appears and disappears with the proxy config. Paste-fixing is hic-straw's
own knowledge of what a fetchable URL looks like and stays unconditional. The
order matters: normalize the paste first, then route, so a consumer rule sees the
host the bytes actually come from.

The original claim that composition "can be added later without breaking callers"
was wrong in both directions, which is why this is settled now rather than later.

**2. `mapUrl` is a development affordance.**

In production every consumer runs on an allowlisted origin and reaches ENCODE
directly; it is `localhost` that gets challenged. `mapUrl` therefore exists so
that development against an origin-restricted host does not require patching
global `fetch`. It is not a production routing mechanism and should not grow into
one. It earns its place as a public config key because hic-straw is the single
chokepoint every read passes through, while a consumer's URL entry points — file
picker, paste, query param, restored session — are many, and two projects
(juicebox.js, Spacewalk) would otherwise each reimplement the same rewrite at all
of them.

**3. Response detail, verified and widened.**

`X-Amzn-Waf-Action` is genuinely readable from JavaScript — confirmed against a
live challenge response, which sets `Access-Control-Expose-Headers:
x-amzn-waf-action`. Without that, a cross-origin `fetch` would have filtered the
header out and this extension point would not have solved its motivating case.

Two further findings widened the change. `statusText` is empty over HTTP/2, so
every failure was throwing `Error("")` — the message is now built from the status
and the URL. And the `console.error` that stood beside the throw fired on the
`416` that `hicFile.js` treats as the normal "file has no norm vectors" path, so
it is gone; a library reports by throwing.

Released as **v4.0.0** — a new config key would have been a feature (v3.1.0), but
this work ships alongside the removal of `config.apiKey` (issue #53), and
removing a public config key is breaking.

## Reversal

Removing either extension point is a breaking change to hic-straw's public
config once consumers depend on it. `err.headers` is additive and safe to keep
indefinitely. `mapUrl` would only be removed if hic-straw grew a fuller transport
abstraction that subsumes it.
