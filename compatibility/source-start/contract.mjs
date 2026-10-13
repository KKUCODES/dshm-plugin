// 新版只在固定源码、真实profile/CJS/Worker身份对照通过后开放；不按semver范围猜测兼容。
export const latestInputs = [
  ['tsconfig.json', '9eb420010dfd10daaa1a5374ce018fd691b1ba56a4bea60f2ebd8d548ffdffa4'],
  ['tsconfig.base.json', 'cc331734ab1605bff2fa888339a4c5917b37f203f4633cfc2d5b2d406db3123b'],
  ['apps/cli/src/bin.ts', '7081b6503a635eb6c6d9c3e4619e740afe157252b246aa17acbf1a1ceec54c88'],
  ['apps/cli/src/profile-boot.ts', '6c750b3c838e42de921bbe9816aed1d8955526c90fccaece8c06969faa9830e6'],
  ['packages/boot/app-boot/src/profile-resolution/resolver.ts', '2e6790adf769de81a2f8f7195f9e14e0a2d08731499c77ff34a41121e05b4ac3'],
  ['packages/boot/app-boot/src/profile-resolution/service.ts', '3a8a0c3e4e5c44cf7db8330786819af2b7fb2026c28c4cca62660fc377ccc06a'],
];
export const originalCommand = 'node --import tsx/esm apps/cli/src/bin.ts';
export const patchedCommand = 'node --import tsx/esm --import ./.dshm-source/bootstrap.mjs apps/cli/src/bin.ts';
