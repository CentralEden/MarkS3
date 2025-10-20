// Empty fs/promises module for browser compatibility
const promises = {
  readFile: () => Promise.resolve(''),
  writeFile: () => Promise.resolve(),
  access: () => Promise.resolve(),
  stat: () => Promise.resolve({}),
  mkdir: () => Promise.resolve(),
  rmdir: () => Promise.resolve(),
  unlink: () => Promise.resolve()
};

export default promises;
export const readFile = () => Promise.resolve('');
export const writeFile = () => Promise.resolve();
export const access = () => Promise.resolve();
export const stat = () => Promise.resolve({});
export const mkdir = () => Promise.resolve();
export const rmdir = () => Promise.resolve();
export const unlink = () => Promise.resolve();