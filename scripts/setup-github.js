#!/usr/bin/env node

/**
 * GitHub Repository Setup Script
 * Automates GitHub repository creation, remote configuration, and initial commit/push
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { simpleGit } from 'simple-git';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const git = simpleGit();

class GitHubSetup {
  constructor() {
    this.config = {};
  }

  async run() {
    console.log(chalk.blue.bold('\n🚀 MarkS3 GitHub Repository Setup\n'));
    
    try {
      await this.checkPrerequisites();
      await this.gatherConfiguration();
      await this.initializeGitRepository();
      await this.updatePackageJson();
      await this.createInitialCommit();
      await this.createGitHubRepository();
      await this.pushToGitHub();
      await this.displaySuccess();
    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log(chalk.yellow('📋 Checking prerequisites...'));
    
    // Check if git is installed
    try {
      execSync('git --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Git is not installed. Please install Git first.');
    }

    // Check if GitHub CLI is installed
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/');
    }

    // Check if user is authenticated with GitHub CLI
    try {
      execSync('gh auth status', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Not authenticated with GitHub CLI. Please run "gh auth login" first.');
    }

    console.log(chalk.green('✅ Prerequisites check passed'));
  }

  async gatherConfiguration() {
    console.log(chalk.yellow('\n📝 Repository Configuration'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'repositoryName',
        message: 'Repository name:',
        default: 'marks3',
        validate: (input) => {
          if (!input.trim()) return 'Repository name is required';
          if (!/^[a-zA-Z0-9._-]+$/.test(input)) {
            return 'Repository name can only contain letters, numbers, dots, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Repository description:',
        default: 'A serverless markdown wiki system hosted on AWS S3 with Cognito authentication'
      },
      {
        type: 'list',
        name: 'visibility',
        message: 'Repository visibility:',
        choices: [
          { name: 'Public (recommended for open source)', value: 'public' },
          { name: 'Private', value: 'private' }
        ],
        default: 'public'
      },
      {
        type: 'confirm',
        name: 'addTopics',
        message: 'Add GitHub topics/tags?',
        default: true
      }
    ]);

    if (answers.addTopics) {
      const topicsAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'topics',
          message: 'Topics (comma-separated):',
          default: 'wiki,markdown,serverless,aws,s3,cognito,svelte,typescript',
          filter: (input) => input.split(',').map(topic => topic.trim()).filter(Boolean)
        }
      ]);
      answers.topics = topicsAnswer.topics;
    }

    this.config = answers;
  }

  async initializeGitRepository() {
    console.log(chalk.yellow('\n🔧 Initializing Git repository...'));
    
    const isGitRepo = await git.checkIsRepo();
    
    if (!isGitRepo) {
      await git.init();
      console.log(chalk.green('✅ Git repository initialized'));
    } else {
      console.log(chalk.blue('ℹ️  Git repository already exists'));
    }

    // Check if there are any remotes
    const remotes = await git.getRemotes(true);
    if (remotes.length > 0) {
      const { overwriteRemote } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwriteRemote',
          message: 'Git remotes already exist. Overwrite with new GitHub repository?',
          default: false
        }
      ]);
      
      if (!overwriteRemote) {
        throw new Error('Setup cancelled - existing remotes found');
      }
      
      // Remove existing remotes
      for (const remote of remotes) {
        await git.removeRemote(remote.name);
      }
    }
  }

  async updatePackageJson() {
    console.log(chalk.yellow('\n📦 Updating package.json...'));
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Get GitHub username
    const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
    
    // Update repository URLs
    packageJson.repository = {
      type: 'git',
      url: `git+https://github.com/${username}/${this.config.repositoryName}.git`
    };
    
    packageJson.bugs = {
      url: `https://github.com/${username}/${this.config.repositoryName}/issues`
    };
    
    packageJson.homepage = `https://github.com/${username}/${this.config.repositoryName}#readme`;
    
    // Update name and description if different
    if (this.config.repositoryName !== packageJson.name) {
      packageJson.name = this.config.repositoryName;
    }
    
    if (this.config.description !== packageJson.description) {
      packageJson.description = this.config.description;
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(chalk.green('✅ package.json updated'));
  }

  async createInitialCommit() {
    console.log(chalk.yellow('\n📝 Creating initial commit...'));
    
    // Check if there are any commits
    try {
      await git.log(['-1']);
      console.log(chalk.blue('ℹ️  Repository already has commits'));
      return;
    } catch (error) {
      // No commits yet, create initial commit
    }

    // Add all files
    await git.add('.');
    
    // Create initial commit
    await git.commit('Initial commit: MarkS3 serverless markdown wiki system\n\n- Complete SvelteKit application with TypeScript\n- AWS S3 + Cognito integration\n- Milkdown markdown editor\n- Terraform infrastructure\n- Comprehensive test suite');
    
    console.log(chalk.green('✅ Initial commit created'));
  }

  async createGitHubRepository() {
    console.log(chalk.yellow('\n🐙 Creating GitHub repository...'));
    
    const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
    
    try {
      // Check if repository already exists
      execSync(`gh repo view ${username}/${this.config.repositoryName}`, { stdio: 'ignore' });
      
      const { overwriteRepo } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwriteRepo',
          message: `Repository ${username}/${this.config.repositoryName} already exists. Continue with existing repository?`,
          default: true
        }
      ]);
      
      if (!overwriteRepo) {
        throw new Error('Setup cancelled - repository already exists');
      }
      
      console.log(chalk.blue('ℹ️  Using existing GitHub repository'));
    } catch (error) {
      // Repository doesn't exist, create it
      let createCommand = `gh repo create ${this.config.repositoryName} --${this.config.visibility} --description "${this.config.description}"`;
      
      if (this.config.topics && this.config.topics.length > 0) {
        // Add topics after repository creation
        execSync(createCommand);
        
        // Set topics
        const topicsJson = JSON.stringify(this.config.topics);
        execSync(`gh api repos/${username}/${this.config.repositoryName}/topics -X PUT -f names='${topicsJson}'`);
      } else {
        execSync(createCommand);
      }
      
      console.log(chalk.green(`✅ GitHub repository created: https://github.com/${username}/${this.config.repositoryName}`));
    }
    
    // Add remote
    const remoteUrl = `https://github.com/${username}/${this.config.repositoryName}.git`;
    await git.addRemote('origin', remoteUrl);
    console.log(chalk.green('✅ Remote origin added'));
  }

  async pushToGitHub() {
    console.log(chalk.yellow('\n⬆️  Pushing to GitHub...'));
    
    try {
      // Push to main branch
      await git.push('origin', 'main', { '--set-upstream': null });
      console.log(chalk.green('✅ Code pushed to GitHub'));
    } catch (error) {
      // Try master branch if main doesn't work
      try {
        await git.push('origin', 'master', { '--set-upstream': null });
        console.log(chalk.green('✅ Code pushed to GitHub (master branch)'));
      } catch (masterError) {
        throw new Error(`Failed to push to GitHub: ${error.message}`);
      }
    }
  }

  async displaySuccess() {
    const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
    const repoUrl = `https://github.com/${username}/${this.config.repositoryName}`;
    
    console.log(chalk.green.bold('\n🎉 GitHub repository setup completed successfully!\n'));
    console.log(chalk.cyan('Repository Details:'));
    console.log(`  📍 URL: ${repoUrl}`);
    console.log(`  📝 Name: ${this.config.repositoryName}`);
    console.log(`  🔒 Visibility: ${this.config.visibility}`);
    console.log(`  📄 Description: ${this.config.description}`);
    
    if (this.config.topics && this.config.topics.length > 0) {
      console.log(`  🏷️  Topics: ${this.config.topics.join(', ')}`);
    }
    
    console.log(chalk.yellow('\nNext Steps:'));
    console.log('  1. Visit your repository on GitHub');
    console.log('  2. Configure repository settings if needed');
    console.log('  3. Set up branch protection rules (recommended)');
    console.log('  4. Add collaborators if working in a team');
    console.log('  5. Consider setting up GitHub Actions for CI/CD');
    
    console.log(chalk.blue('\nUseful Commands:'));
    console.log(`  gh repo view ${username}/${this.config.repositoryName} --web`);
    console.log(`  git remote -v`);
    console.log(`  git push origin main`);
  }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new GitHubSetup();
  setup.run().catch(error => {
    console.error(chalk.red('\n💥 Unexpected error:'), error);
    process.exit(1);
  });
}

export default GitHubSetup;