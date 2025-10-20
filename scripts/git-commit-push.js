#!/usr/bin/env node

import { simpleGit } from 'simple-git';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function commitAndPush() {
  try {
    const git = simpleGit(projectRoot);
    
    console.log('Project root:', projectRoot);
    
    // Check if we're in a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }
    
    // Check git status
    console.log('\n=== Git Status ===');
    const status = await git.status();
    console.log(`Modified files: ${status.modified.length}`);
    console.log(`New files: ${status.not_added.length}`);
    console.log(`Deleted files: ${status.deleted.length}`);
    
    if (status.modified.length > 0 || status.not_added.length > 0 || status.deleted.length > 0) {
      // Add all changes
      console.log('\n=== Adding changes ===');
      await git.add('.');
      
      // Commit with a message
      const commitMessage = `docs: clean up deployment-fixes tasks formatting

- Remove excessive blank lines
- Fix inconsistent sub-task numbering  
- Maintain proper indentation
- Preserve all technical content in Japanese`;
      
      console.log('\n=== Committing changes ===');
      await git.commit(commitMessage);
      
      // Push to remote
      console.log('\n=== Pushing to remote ===');
      await git.push();
      
      console.log('\n✅ Successfully pushed changes!');
    } else {
      console.log('\n✅ No changes to commit');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

commitAndPush();