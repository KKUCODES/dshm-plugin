# DSHM Plugin for DeepSeek Harness

[简体中文](./README.md) | English

[DSHM Android app](https://github.com/KKUCODES/deepseek-harness-mobile/blob/main/README.en.md) · **DSHM desktop plugin** · [DSHM relay server](https://github.com/KKUCODES/dshm-relay/blob/main/README.en.md)

**DSHM Plugin** runs inside official [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) on your computer, synchronizing workspaces, chat sessions, execution results, and approvals with the [DSHM Android client](https://github.com/KKUCODES/deepseek-harness-mobile/blob/main/README.en.md). Continue conversations and make decisions remotely while the computer executes tasks. No DSH core modifications or rebuilds are required.

[Install from GitHub](#install-the-plugin-and-pair-your-phone) · [Download plugin packages (GitHub sign-in required)](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) · [DSH compatibility (Chinese)](./compatibility/latest-upstream/official-support.md) · [FAQ](#faq)

<p align="center">
  <img src="./docs/images/logo.png" width="128" height="128" alt="DSHM logo: the DeepSeek whale with a two-way phone and computer connection">
</p>

![DSHM Plugin: connect your computer's work to your phone.](./docs/images/hero.png)

## Remote sessions and device management

| Capability | What you can do |
| --- | --- |
| Conversation sync | View workspaces and history, create chats, send messages, switch models, and handle approvals. |
| Device management | Generate one-time pairing links valid for five minutes; verify fingerprints, approve, reject, or revoke devices. |
| Access control | Enable or disable remote connections. Computer management permission is granted and revoked separately. |
| Extensions | Forward files, tool results, and compatible plugin interface elements through permitted APIs. |

![DSHM plugin settings in DeepSeek Harness: the computer is connected and phone pairing awaits approval.](./docs/images/desktop-pairing.png)

[Image sources (Chinese)](./docs/images/README.md). The real plugin interface uses demo devices and Simplified Chinese labels.

## Install the plugin and pair your phone

[Plugin builds and downloads (Chinese)](./docs/releases.md) · [GitHub Actions](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) · [Releases](https://github.com/KKUCODES/dshm-plugin/releases)

**Official DSH `0.2.0-rc.2` and `0.2.1-alpha.2` use the same GitHub package:**

```sh
dsh plugin --profile web add github:KKUCODES/dshm-plugin
```

`dsh plugin` is the official DSH command. From a DSH source checkout, use `pnpm dsh plugin --profile web add github:KKUCODES/dshm-plugin`. Compiled files are included: installation requires no compiler, adjacent backend checkout, or build-script approval. Prefer the market's command pinned with `#<full-commit-sha>` for a scanned version. [GitHub installation details (Chinese)](./docs/github-install.md)

The default GitHub package, `0.1.84-latest.0`, supports these two specific versions. Alpha.1 still requires its separate `.tgz`. Actions produces three version-specific archives according to the [CI configuration](./ci/release.json); downloading Artifacts requires a GitHub login. The Release remains an unpublished draft.

Connecting to rc.2 also requires this compatibility update to the DSHM app. The public `0.1.0-preview.1` APK still targets alpha.2 only. [Validation and app requirements (Chinese)](./compatibility/latest-upstream/market-baseline.md) · [Pairing guide (Chinese)](./docs/usage.md)

1. Install a plugin build matching your DSH version and run `pnpm dsh web`. Restart DSH if it says the plugin will load on the next start.
2. Enter the relay's root URL and computer name, register the computer, and enable the connection.
3. Claim the pairing link on your phone, then verify its fingerprint and approve it on the computer.
4. Open an existing workspace on your phone to continue a conversation or start a new chat.

**[Hosting your own relay](https://github.com/KKUCODES/dshm-relay/blob/main/README.en.md) is recommended.** Alternatively, enter the [public service](http://118.31.20.47:18787) URL: `http://118.31.20.47:18787`. Open registration requires no enrollment token; devices still need pairing and approval. No user account is needed.

The public service uses HTTP, so transport is unencrypted. Use a self-hosted HTTPS relay for sensitive content. Keep the computer and DSH running. [Full setup instructions (Chinese)](./docs/usage.md)

## Change the relay server address

In the plugin settings, select **“修改服务地址” (Change server address)**:

- **New address for the same backend:** Change the domain, port, or HTTP/HTTPS scheme. After verification, the computer identity and device permissions are retained.
- **Different backend:** Register and pair again. Private mode requires the new backend's enrollment token. Permissions on the old service are not automatically revoked.

![DSHM computer plugin: changing the relay URL and choosing to retain device permissions or pair again.](./docs/images/change-server.png)

Canceling or failed verification keeps the original connection. A successful save preserves whether the connection is enabled or disabled. The phone needs a new link to pair again. [Detailed steps (Chinese)](./docs/usage.md#5-修改服务地址)

## Current status

| Scope | Version and validated behavior |
| --- | --- |
| GitHub installation | `0.1.84-latest.0` shares one compiled package across official DSH `0.2.0-rc.2` / `0.2.1-alpha.2`. Both passed official installation, settings-page and removal checks. [Evidence (Chinese)](./compatibility/latest-upstream/market-baseline.md) |
| Actions download builds | Separate, exact-version archives for rc.2, alpha.1 and alpha.2; local packaging passed. [Build guide (Chinese)](./docs/releases.md) |
| Relay URL changes | [Separate settings-page validation (Chinese)](./compatibility/latest-upstream/gateway-settings.md) with `0.1.81-latest.0`; not a complete Remote rerun. |
| Core Remote | Official DSH `0.2.1-alpha.2` + plugin `0.1.80-latest.0` + the original matching Android app, validated locally in Web + MuMu. [Support matrix (Chinese)](./compatibility/latest-upstream/official-support.md) |

No plugin Release is public yet. Successful GitHub installation or packaging does not establish full phone compatibility for a new package. Electron, physical devices, the complete public-network path, and other versions, plugins, and models need separate validation.

The phone does not create computer workspaces, accept manually entered commands, or forward computer localhost websites.

## FAQ

### Which plugin package matches my DSH version?

Check computer DSH's version. The default GitHub package supports `0.2.0-rc.2` and `0.2.1-alpha.2`. For `.tgz` downloads, choose the exact matching `dsh-<version>` in the name; for example, `dshm-plugin-0.1.84-latest.0-dsh-0.2.0-rc.2.tgz` targets rc.2. Alpha.1 requires its own archive. Recheck the [compatibility report (Chinese)](./compatibility/latest-upstream/official-support.md) after updating DSH.

### Does claiming a pairing link immediately allow computer access?

The computer must first verify the phone's public-key fingerprint and approve it. Links expire after five minutes and can only be claimed once. Revoke approved devices from the computer's plugin settings; computer management permission is granted separately.

### Does continuing conversations require computer management permission?

No. Device approval allows chat and task operations. Managing computer workspaces, plugins, and settings requires separate management permission, which can also be revoked separately. See [access management (Chinese)](./docs/usage.md#4-管理访问).

## Development and documentation

TypeScript + Cordis, with a React settings page. GitHub Actions prepares the pinned backend protocol and published SDK packages, builds separate archives for three DSH versions, and verifies the committed GitHub package against source. `lib/` provides installed entry points; `dist/` is only the legacy development output. See the [build guide (Chinese)](./docs/releases.md) and development guide.

```text
src/              Computer plugin, conversation adapter, and settings page
lib/              Committed GitHub install files, rebuilt and checked in CI
scripts/          Build and audit scripts
tests/            Plugin tests and fixtures
docs/             Usage, development, and technical documentation
compatibility/    Version support and compatibility evidence
```

Detailed guides are currently in Chinese:

- [Installation and usage](./docs/usage.md): connection, approval, and revocation.
- [Development guide](./docs/development.md): dependencies, builds, and versions.
- [Downloads and releases](./docs/releases.md): Actions packages and release drafts.
- [GitHub installation and market submission](./docs/github-install.md): official commands, pinned commits, and versions.
- [Support matrix](./compatibility/latest-upstream/official-support.md): validated and unvalidated scope.
- [Knowledge catalog](./docs/project-knowledge/catalog.md): architecture, interfaces, and validation evidence.
