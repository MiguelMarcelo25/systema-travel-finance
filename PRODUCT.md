# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Systema serves the agency administrator and travel clients in separate workspaces.

## Product Purpose

Manage travel bookings, requests, payments, documents, and agency financial reports.

## Capabilities and Constraints

The user requested password recovery, account email verification, package sales predictions, and improved admin/client interfaces. They confirmed that booking selection should show travel packages with destinations and prices. The dedicated admin@systema.com account is exempt from email verification only while its stored role is Administrator. Existing financial rules, client privacy, and administrator approval of requests remain in place. Predictions must distinguish estimates from recorded sales.

## Evidence on Hand

README.md describes implemented workflows. src/styles.css and src/workspace.css establish the current coastal authentication screen and blue workspace design. Real package names, destinations, and prices come from saved records; never invent live offerings.

## Open Decisions

Gmail SMTP is configured for production using server-only credentials. Actual inbox delivery still needs a client account check. Local development previews messages in private files. Resend remains an optional adapter for a verified sending domain.
