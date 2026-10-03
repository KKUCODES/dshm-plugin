export const baseline = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const patchVersion = 'plugin-install-cancel-v1';
export const directory = 'packages/boot/plugin-manager';
export const changes = [{ path: `${directory}/src/operations.ts`,
  sha256: '439ba0a4e681178e0f735e4f9dc5256e9ab609d82b1c0e396a9a89a6b78d8ea6',
  edits: [{
    before: "    cwd: dir, env: { ...(options.execution === 'cli' ? process.env : scrubbedParentEnv()), ...options.env }, extendEnv: false,",
    after: `    // pnpm.cmd and install scripts can spawn descendants that outlive the launcher.
    killDescendants: true,
    cwd: dir, env: { ...(options.execution === 'cli' ? process.env : scrubbedParentEnv()), ...options.env }, extendEnv: false,`,
  }, {
    before: "    cwd: dir, env: { ...scrubbedParentEnv(), ...options.env }, extendEnv: false, reject: false, stdin: 'ignore',",
    after: `    // Lookup cancellation and timeout must also stop pnpm.cmd's Node child.
    killDescendants: true,
    cwd: dir, env: { ...scrubbedParentEnv(), ...options.env }, extendEnv: false, reject: false, stdin: 'ignore',`,
  }],
}];
