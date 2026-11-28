# 0016: Nothing is stored for an authorization request

Status: proposed; not implemented
Date: 2026-11-28
Relates to: [0007](0007-re-authenticating-at-consent.md), #670
Supersedes: the stored request and handle of [0015](0015-consent-is-a-page-of-the-application.md)

The authorization server keeps no record of an authorization request. `/o/authorize/`
validates the request and redirects to the consent page with the query string unchanged.
The page reads what to show from that query and posts it back with the user's decision,
and the server validates it again before issuing a code. The `PendingAuthorization` model
and its table are removed.

## Context

[0015](0015-consent-is-a-page-of-the-application.md) stores every validated request as a
row and hands the consent page a handle. `/o/authorize/` needs no sign-in, so each request
from anyone writes a row, and nothing deletes expired or used ones. Vikram's review of #670
(2026-11-24) pointed out that a script calling it in a loop grows the table without bound.

Precogly runs nothing on a schedule. celery and django-celery-beat are dependencies but
are not configured, and no container runs a worker or beat. django-oauth-toolkit's
`cleartokens`, a command meant for cron, is not run either.

What other servers keep for a request before the user decides, checked 2026-11-26 and
2026-11-28:

| Server | Where the request lives until the decision | Cleanup |
|---|---|---|
| GitHub | `return_to=<the full authorize URL>` on the login redirect | none needed |
| Google | `continue=…/consent?…` carrying the parameters, plus an opaque `dsh` | not visible |
| Doorkeeper | hidden fields in the consent form, posted back and validated again | none needed |
| Cloudflare `workers-oauth-provider` | the URL, read by `parseAuthRequest()`; consent state in a short-lived `__Host-` cookie | cookie expiry |
| Ory Hydra | encrypted into the `login_challenge`, which carries its own creation time | rejected after `ConsentRequestMaxAge` |
| node-oidc-provider | an `Interaction` saved through the storage adapter | `ttl.Interaction` |
| Keycloak | an authentication session in its own cache | expiry, 30 minutes by default |

GitHub and Google were observed with `curl` against their authorize endpoints, using the
public client ids of the GitHub CLI and gcloud. The others are from their source or
documentation, listed under Sources. The servers that store the request do so in a store
that expires entries itself; Precogly has only Postgres.

## Decision

The request travels in the URL of every step, as it does at GitHub:

```text
  client     browser                        backend                          SPA
    |           |                              |                               |
  1 |-- open -->| GET /o/authorize/?<query> -->| validate; store nothing       |
  2 |           |<- 302 /oauth/consent?<query> |                               |
  3 |           |------------------------------------------------------------>| sign in if
    |           |                              |                               | needed, back
    |           |                              |                               | to same URL
  4 |           |                              |<- GET authorization-request?<query>
    |           |                              | validate; store nothing       |
    |           |                              |-- client, scopes, resource -->|
  5 |           |                              |<- POST decision?<query> {allow, password}
    |           |                              | validate again; check         |
    |           |                              | password; revoke; issue code  |
  6 |<- code ---|<- navigate to redirect URL ----------------------------------|
```

1. **`/o/authorize/` validates and redirects.** A bad client, redirect URI or `resource`
   fails here, as today. A valid request redirects to `/oauth/consent` with the same
   query string.
2. **The consent page reads what to show** from
   `GET /api/oauth/authorization-request?<query>`, which runs the same validation and
   returns the client's name, the scopes and the resource. It requires the application's
   JWT, like the decision.
3. **The decision carries the query in its URL:** `POST /api/oauth/decision?<query>`
   with the body `{allow, password}`. All three endpoints hand django-oauth-toolkit the
   request they received, so it validates the query from the URL as it does at
   `/o/authorize/`. The body is JSON only: a form-encoded body would fill
   `request.POST`, so oauthlib would read its fields as request parameters. The view
   validates the query again, because it came back through the browser and could have
   been edited; an invalid one is a 404 at both API endpoints. On allow it then checks
   the password ([0007](0007-re-authenticating-at-consent.md)), revokes the client's
   earlier tokens, and issues the code. On deny it redirects with `access_denied`.
4. **`PendingAuthorization` is removed,** and a migration drops its table.

## Rejected

- **Storing the row after sign-in,** this record's first draft (2026-11-26). The page
  posts the query once signed in, and the server creates a row already bound to the user.
  Signed-out requests write nothing, but signed-in ones still do, so the table still needs
  deleting from. The row buys a ten-minute window and single use, which the trade-offs
  below find unnecessary.
- **Keeping 0015's rows and deleting stale ones on insert.** Bounds the table to the
  request rate times ten minutes, but every signed-out request still costs a write.
- **A `cleartokens`-style command run from cron.** Precogly has no scheduler, and
  `cleartokens` already goes unrun, so this would too.
- **The query in the decision's body,** `{query, allow, password}`. django-oauth-toolkit
  validates only the request it is handed, so the view would build a second Django
  request carrying the query just to validate it.
- **A sealed request,** encrypted or signed and carried in the URL, as Hydra does with
  `login_challenge`. It stores nothing and would bring back the expiry. It adds a format
  and a key to rotate, for an expiry this design does not need.
- **Fingerprinting the browser to reuse a row.** The authorize request comes from
  whatever browser the client opens. A script sets its own address and User-Agent, and
  open dynamic registration lets it mint a `client_id` per request, so a fingerprint only
  deduplicates honest retries.

## Trade-offs

- **The consent page's URL carries the request:** `state`, `code_challenge`,
  `redirect_uri`, `scope`, `resource`. All were already in the authorize URL the client
  opened, and GitHub's `return_to` carries the same. The decision's URL carries it too,
  so it reaches access logs as a POST line; nothing in it is secret.
- **The request is validated three times,** at `/o/authorize/`, on the page's read and on
  the decision. Each reads one application row. The last one is what makes the browser's
  copy safe to act on.
- **A request no longer expires and can be decided more than once.** Neither lets anyone
  else obtain a token. The code goes to the redirect URI from the browser that allowed it,
  and PKCE binds it to the verifier only the client holds, so a copied query yields a code
  nobody else can redeem. Allowing the same query twice issues a second code and revokes
  the tokens from the first.
- **Wrong consent passwords are no longer counted per request.** The row held the counter,
  and five failures ended the request. That limit never bound the user: whoever holds a
  stolen JWT could open requests without limit. One limit per user, shared with
  `/api/auth/login/`, is a separate PR.
- **The request rate is still unbounded.** This removes the storage, not the traffic.
- **Unverified:** that the SPA's login returns to `/oauth/consent` with the full query
  string intact. Today it only has to keep `?id=`.

## Sources

- Doorkeeper @ 2db5203, the consent form's hidden fields and the controller that builds a
  new `PreAuthorization` from them:
  <https://github.com/doorkeeper-gem/doorkeeper/blob/2db5203ae270098b7edae9407dcda72a512ee87a/app/views/doorkeeper/authorizations/new.html.erb>,
  <https://github.com/doorkeeper-gem/doorkeeper/blob/2db5203ae270098b7edae9407dcda72a512ee87a/app/controllers/doorkeeper/authorizations_controller.rb>
- Ory Hydra @ 4174065, `flow/flow_encoding.go` (`decodeFlow`, the `ConsentRequestMaxAge`
  check):
  <https://github.com/ory/hydra/blob/4174065ffb052799890f7480f5360a877a67ffc1/flow/flow_encoding.go>
- node-oidc-provider @ d0c0cf6, `lib/actions/authorization/interactions.js`
  (`interactionSession.save(ttl)`):
  <https://github.com/panva/node-oidc-provider/blob/d0c0cf6e0d48c89d3a084e3aaf6a0078642efd49/lib/actions/authorization/interactions.js>
- Keycloak @ 94ec569, `services/src/main/java/org/keycloak/protocol/AuthorizationEndpointBase.java`
  (`createAuthenticationSession`):
  <https://github.com/keycloak/keycloak/blob/94ec569eb1fb59aa79f5a2dbd5d55621c9436717/services/src/main/java/org/keycloak/protocol/AuthorizationEndpointBase.java>;
  server administration guide, "Authentication sessions" (30-minute default):
  <https://www.keycloak.org/docs/latest/server_admin/index.html>
- Cloudflare `workers-oauth-provider` @ d2949f3, `docs/consent-page.md`:
  <https://github.com/cloudflare/workers-oauth-provider/blob/d2949f30a5fc7d396bb2d922c8f0a6f9eab185a2/docs/consent-page.md>
- django-oauth-toolkit 3.4.1, `oauth2_provider/management/commands/cleartokens.py`
