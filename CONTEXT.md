# Context — hic-straw

The ubiquitous language of this codebase. When naming a module, a test, an issue
or a variable, use the term as defined here rather than a synonym.

hic-straw is a **library**, not an application. It reads `.hic` contact map files
— locally, over HTTP with byte ranges, or as a live stream — and hands contact
records to consumers. juicebox.js, Spacewalk and igv.js all depend on it. It
renders nothing and has no UI.

This glossary is grown lazily: terms are added when a decision actually turns on
them, not upfront.

## Transport

**Remote file** — `src/io/remoteFile.js`, the single place hic-straw reads bytes
from a URL. Every `.hic` byte-range read in every consumer passes through its
`read(position, length)`. There is exactly one `fetch` call in the library and it
is here.

**Default URL mapper** — the built-in rules that turn a URL a human plausibly
pasted into one a byte-range GET can work against: a Dropbox share link becomes a
direct-download link, an NCBI `ftp://` URL becomes `https://`. Always applied. A
consumer cannot switch it off.

**URL mapper** — the optional `config.mapUrl` function a consumer supplies to
rewrite a URL before it is fetched, composed on top of the default URL mapper.
Synchronous, pure, URL-in URL-out: it cannot touch headers, responses or Range
semantics. It exists so that development against an origin-restricted host does
not require patching global `fetch`; it is not a production routing mechanism.
See `docs/adr/0001`.

**Logical URL** — the URL a consumer asked for. **Physical URL** — the URL
actually fetched, after both mappers. The rest of the library reasons about the
logical URL (the normalization-vector index is keyed on it, so a mapped URL does
not lose the lookup); only the remote file knows the physical one.

**Response detail** — the `headers` and `url` properties attached to the `Error`
thrown on a failed read, alongside the existing `code`. Exists because the status
code alone can be actively misleading; the header a consumer needs to diagnose
the failure would otherwise die inside hic-straw. See `docs/adr/0001`.

**Bot challenge** — a data host answering an automated request with a CAPTCHA
page instead of the file. hic-straw does not detect or interpret these; it
surfaces the response detail and consumers decide what it means. The known case
is AWS WAF in front of `www.encodeproject.org`, which serves
`X-Amzn-Waf-Action: captcha` under a misleading `405` status to any request whose
`Origin` is not on ENCODE's allowlist. That header is readable from JavaScript:
the challenge response sets `Access-Control-Expose-Headers: x-amzn-waf-action`.
Only a browser sends `Origin`, so a bot challenge cannot be reproduced from Node
and cannot be covered by this repo's tests.
