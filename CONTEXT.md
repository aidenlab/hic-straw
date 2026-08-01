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

**URL mapper** — the optional `config.mapUrl` function a consumer supplies to
rewrite a URL before it is fetched. Replaces the built-in rules (Dropbox share
links, NCBI FTP-to-HTTPS). Synchronous, pure, URL-in URL-out: it cannot touch
headers, responses or Range semantics. See `docs/adr/0001`.

**Response detail** — the `headers` and `url` properties attached to the `Error`
thrown on a failed read, alongside the existing `code`. Exists because the status
code alone can be actively misleading; the header a consumer needs to diagnose
the failure would otherwise die inside hic-straw. See `docs/adr/0001`.

**Bot challenge** — a data host answering an automated request with a CAPTCHA
page instead of the file. hic-straw does not detect or interpret these; it
surfaces the response detail and consumers decide what it means. The known case
is AWS WAF in front of `www.encodeproject.org`, which serves
`X-Amzn-Waf-Action: captcha` under a misleading `405` status to any request whose
`Origin` is not on ENCODE's allowlist.
