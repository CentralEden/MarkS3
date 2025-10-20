// Empty child_process module for browser compatibility
export default {};
export const exec = () => {};
export const spawn = () => {};
export const fork = () => {};
export const execSync = () => '';
export const spawnSync = () => ({});