#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  // Change to the script's directory (which should be the project root)
  process.chdir(__dirname);
  
  console.log('Current directory:', process.cwd());
  
  // Check git status
  console.log('\n=== Git Status ===');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log(status || 'No changes detected');
  
  if (status.trim()) {
    // Add all changes
    console.log('\n=== Adding changes ===');
    execSync('git add .', { stdio: 'inherit' });
    
    // Commit with a message
    const commitMessage = 'docs: clean up deployment-fixes tasks formatting\n\n- Remove excessive blank lines\n- Fix inconsistent sub-task numbering\n- Maintain proper indentation\n- Preserve all technical content in Japanese';
    
    console.log('\n=== Committing changes ===');
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    // Push to remote
    console.log('\n=== Pushing to remote ===');
    execSync('git push', { stdio: 'inherit' });
    
    console.log('\n✅ Successfully pushed changes!');
  } else {
    console.log('\n✅ No changes to commit');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}