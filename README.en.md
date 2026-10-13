# DSHM Plugin for DeepSeek Harness

[简体中文](./README.md) | English

[DSHM Android app](https://github.com/KKUCODES/deepseek-harness-mobile/blob/main/README.en.md) · **DSHM desktop plugin** · [DSHM relay server](https://github.com/KKUCODES/dshm-relay/blob/main/README.en.md)

**DSHM Plugin** runs inside official [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) on your computer, synchronizing workspaces, chat sessions, execution results, and approvals with the [DSHM Android client](https://github.com/KKUCODES/deepseek-harness-mobile/blob/main/README.en.md). Continue conversations and make decisions remotely while the computer executes tasks. No DSH core modifications or rebuilds are required.

[Download plugin packages (GitHub sign-in required)](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) · [Install and pair your phone](#install-the-plugin-and-pair-your-phone) · [DSH compatibility (Chinese)](./compatibility/latest-upstream/official-support.md) · [FAQ](#faq)

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

Actions currently provides `0.1.82-latest.0` builds for DSH `0.2.1-alpha.1` and `0.2.1-alpha.2` separately. Sign in to GitHub, choose a successful build, download its matching Artifacts, and extract the `.tgz`. The Release remains an unpublished draft. Check the [version and validation scope](#current-status) below before installing; follow the [installation guide (Chinese)](./docs/usage.md) for full steps.

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
| Actions download builds | `0.1.82-latest.0`, with separate archives for official DSH `0.2.1-alpha.1` / `0.2.1-alpha.2`. Packaging, files, and checksums were verified; archives are not interchangeable. [Build guide (Chinese)](./docs/releases.md) |
| Relay URL changes | [Separate settings-page validation (Chinese)](./compatibility/latest-upstream/gateway-settings.md) with `0.1.81-latest.0`; not a complete Remote rerun. |
| Core Remote | Official DSH `0.2.1-alpha.2` + plugin `0.1.80-latest.0` + the original matching Android app, validated locally in Web + MuMu. [Support matrix (Chinese)](./compatibility/latest-upstream/official-support.md) |

No plugin Release is public yet. A successful `0.1.82` build does not establish full phone compatibility for that package. Electron, physical devices, the complete public-network path, and other versions, plugins, and models need separate validation.

The phone does not create computer workspaces, accept manually entered commands, or forward computer localhost websites.

## FAQ

### Which plugin package matches my DSH version?

Check computer DSH's version and choose the archive with the exact matching `dsh-<version>` in its name. For example, alpha.2 uses `dshm-plugin-0.1.82-latest.0-dsh-0.2.1-alpha.2.tgz`. Recheck the [compatibility report (Chinese)](./compatibility/latest-upstream/official-support.md) after updating DSH; do not assume an old package or unvalidated version is compatible.

### Does claiming a pairing link immediately allow computer access?

The computer must first verify the phone's public-key fingerprint and approve it. Links expire after five minutes and can only be claimed once. Revoke approved devices from the computer's plugin settings; computer management permission is granted separately.

### Does continuing conversations require computer management permission?

No. Device approval allows chat and task operations. Managing computer workspaces, plugins, and settings requires separate management permission, which can also be revoked separately. See [access management (Chinese)](./docs/usage.md#4-管理访问).

## Development and documentation

TypeScript + Cordis, with a React settings page. GitHub Actions prepares the pinned backend protocol and published SDK packages, building separate archives for the two DSH versions. The default local build still targets the older baseline. See the [automated build guide (Chinese)](./docs/releases.md) and development guide.

```text
src/              Computer plugin, conversation adapter, and settings page
scripts/          Build and audit scripts
tests/            Plugin tests and fixtures
docs/             Usage, development, and technical documentation
compatibility/    Version support and compatibility evidence
```

Detailed guides are currently in Chinese:

- [Installation and usage](./docs/usage.md): connection, approval, and revocation.
- [Development guide](./docs/development.md): dependencies, builds, and versions.
- [Downloads and releases](./docs/releases.md): Actions packages and release drafts.
- [Support matrix](./compatibility/latest-upstream/official-support.md): validated and unvalidated scope.
- [Knowledge catalog](./docs/project-knowledge/catalog.md): architecture, interfaces, and validation evidence.
